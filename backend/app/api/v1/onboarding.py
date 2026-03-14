"""Onboarding state machine endpoints."""

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.onboarding_state import OnboardingState
from app.schemas.onboarding import (
    ONBOARDING_STEPS,
    OnboardingCompleteStepRequest,
    OnboardingCompleteStepResponse,
    OnboardingResponse,
)
from app.services import agent_service, audit_service

router = APIRouter()


def _next_step(current: str) -> str | None:
    try:
        idx = ONBOARDING_STEPS.index(current)
        if idx + 1 < len(ONBOARDING_STEPS):
            return ONBOARDING_STEPS[idx + 1]
    except ValueError:
        pass
    return None


def _build_response(state: OnboardingState) -> dict:
    is_complete = state.completed_at is not None
    return {
        "current_step": state.current_step,
        "steps_completed": state.steps_completed or [],
        "is_complete": is_complete,
        "next_step": None if is_complete else _next_step(state.current_step),
    }


@router.get("", response_model=OnboardingResponse)
async def get_onboarding(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    state = await db.get(OnboardingState, current_user.user_id)
    if state is None:
        try:
            state = OnboardingState(
                owner_user_id=current_user.user_id,
                current_step="settings_configured",
                steps_completed=["account_created", "email_verified", "mfa_enrolled"],
            )
            db.add(state)
            await db.flush()
            await db.refresh(state)
        except IntegrityError:
            await db.rollback()
            state = await db.get(OnboardingState, current_user.user_id)
            if state is None:
                raise AppError(
                    "ONBOARDING_INIT_FAILED",
                    "Failed to initialize onboarding state",
                    500,
                ) from None

    return _build_response(state)


@router.post("/complete-step", response_model=OnboardingCompleteStepResponse)
async def complete_step(
    body: OnboardingCompleteStepRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    state = await db.get(OnboardingState, current_user.user_id)
    if state is None:
        raise AppError("ONBOARDING_NOT_FOUND", "Onboarding state not found", 404)

    if state.completed_at is not None:
        return _build_response(state)

    completed = list(state.steps_completed or [])

    if body.step in completed:
        return _build_response(state)

    step_idx = ONBOARDING_STEPS.index(body.step) if body.step in ONBOARDING_STEPS else -1
    if step_idx < 0:
        raise AppError("INVALID_STEP", f"Unknown step: {body.step}", 400)

    for prereq in ONBOARDING_STEPS[:step_idx]:
        if prereq not in completed:
            raise AppError(
                "PREREQUISITE_MISSING",
                f"Step '{prereq}' must be completed before '{body.step}'",
                400,
            )

    completed.append(body.step)
    state.steps_completed = completed
    state.updated_at = utcnow()
    state.updated_by_device_id = current_user.device_id

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user_id,
        event_type="onboarding.step_completed",
        actor_id=current_user.device_id,
        details={"step": body.step},
    )

    if body.step == "assistant_setup":
        agent = await agent_service.get_or_create_default_agent(db, current_user.user_id)
        if not agent.elevenlabs_agent_id:
            await agent_service.ensure_elevenlabs_agent(
                db,
                agent,
                current_user.user_id,
            )

    if body.step == "onboarding_complete":
        state.current_step = "onboarding_complete"
        state.completed_at = utcnow()
        await audit_service.log_event(
            db,
            owner_user_id=current_user.user_id,
            event_type="onboarding.completed",
            actor_id=current_user.device_id,
        )
    else:
        next_s = _next_step(body.step)
        if next_s:
            state.current_step = next_s

    await db.flush()
    return _build_response(state)

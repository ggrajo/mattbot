"""Onboarding status API — tracks user setup progress."""

import logging

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError

logger = logging.getLogger(__name__)

router = APIRouter()

ONBOARDING_STEPS = [
    "account_created",
    "subscription_selected",
    "number_provisioned",
    "assistant_configured",
    "calendar_connected",
]

OPTIONAL_STEPS = {"calendar_connected"}


class StepStatus(BaseModel):
    step: str
    completed: bool
    optional: bool = False


class OnboardingStatusResponse(BaseModel):
    steps: list[StepStatus]
    completed: bool = Field(description="True when all required steps are done")
    progress_pct: int = Field(description="0-100 completion percentage")


class CompleteStepRequest(BaseModel):
    step: str


class CompleteStepResponse(BaseModel):
    step: str
    completed: bool
    overall_completed: bool


@router.get("/status", response_model=OnboardingStatusResponse)
async def get_onboarding_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OnboardingStatusResponse:
    """Get onboarding completion status for the current user."""
    try:
        completed_steps = await _compute_completed_steps(db, current_user.user_id)

        steps = [
            StepStatus(
                step=s,
                completed=s in completed_steps,
                optional=s in OPTIONAL_STEPS,
            )
            for s in ONBOARDING_STEPS
        ]

        required_steps = [s for s in ONBOARDING_STEPS if s not in OPTIONAL_STEPS]
        required_done = sum(1 for s in required_steps if s in completed_steps)
        all_required_done = required_done == len(required_steps)

        total = len(ONBOARDING_STEPS)
        done = len(completed_steps & set(ONBOARDING_STEPS))
        pct = int((done / total) * 100) if total > 0 else 0

        return OnboardingStatusResponse(
            steps=steps,
            completed=all_required_done,
            progress_pct=pct,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception(
            "Failed to get onboarding status for user %s", current_user.user_id
        )
        raise AppError(
            "ONBOARDING_ERROR", f"Failed to get onboarding status: {e}", 500
        )


@router.post("/complete-step", response_model=CompleteStepResponse)
async def complete_step(
    body: CompleteStepRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CompleteStepResponse:
    """Mark an onboarding step as complete."""
    if body.step not in ONBOARDING_STEPS:
        raise AppError(
            "INVALID_STEP",
            f"Unknown onboarding step: {body.step}. Valid: {ONBOARDING_STEPS}",
            400,
        )

    try:
        completed_steps = await _compute_completed_steps(db, current_user.user_id)

        if body.step not in completed_steps:
            await _mark_step_complete(db, current_user.user_id, body.step)
            completed_steps.add(body.step)

        required_steps = [s for s in ONBOARDING_STEPS if s not in OPTIONAL_STEPS]
        all_required_done = all(s in completed_steps for s in required_steps)

        return CompleteStepResponse(
            step=body.step,
            completed=True,
            overall_completed=all_required_done,
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception(
            "Failed to complete onboarding step for user %s", current_user.user_id
        )
        raise AppError(
            "ONBOARDING_ERROR", f"Failed to complete step: {e}", 500
        )


async def _compute_completed_steps(
    db: AsyncSession, user_id
) -> set[str]:
    """Derive completed onboarding steps from existing data."""
    from app.models.agent import Agent
    from app.models.billing_subscription import BillingSubscription
    from app.models.google_calendar_token import GoogleCalendarToken
    from app.models.user import User
    from app.models.user_number import UserNumber

    completed: set[str] = set()

    user = await db.get(User, user_id)
    if user and user.status in ("active", "pending_verification"):
        completed.add("account_created")

    sub_result = await db.execute(
        select(BillingSubscription).where(
            BillingSubscription.user_id == user_id,
            BillingSubscription.status.in_(("active", "trialing")),
        )
    )
    if sub_result.scalar_one_or_none():
        completed.add("subscription_selected")

    num_result = await db.execute(
        select(UserNumber).where(
            UserNumber.owner_user_id == user_id,
            UserNumber.status.in_(("active", "provisioned")),
        )
    )
    if num_result.scalar_one_or_none():
        completed.add("number_provisioned")

    agent_result = await db.execute(
        select(Agent).where(
            Agent.user_id == user_id,
            Agent.is_active.is_(True),
        )
    )
    agent = agent_result.scalar_one_or_none()
    if agent and agent.system_prompt:
        completed.add("assistant_configured")

    cal_result = await db.execute(
        select(GoogleCalendarToken).where(
            GoogleCalendarToken.user_id == user_id,
            GoogleCalendarToken.is_active.is_(True),
        )
    )
    if cal_result.scalar_one_or_none():
        completed.add("calendar_connected")

    return completed


async def _mark_step_complete(
    db: AsyncSession, user_id, step: str
) -> None:
    """Persist a manual step completion.

    Most steps are auto-detected from data; this handles edge cases where the
    client marks a step that can't be derived (future-proofing).
    """
    from app.models.agent_config import AgentConfig
    from sqlalchemy import select as sa_select

    result = await db.execute(
        sa_select(AgentConfig).where(
            AgentConfig.user_id == user_id,
            AgentConfig.is_default.is_(True),
        )
    )
    config = result.scalar_one_or_none()
    if config:
        meta = config.metadata_json or {}
        onboarding = meta.get("onboarding_completed", [])
        if step not in onboarding:
            onboarding.append(step)
        meta["onboarding_completed"] = onboarding
        config.metadata_json = meta
        await db.flush()

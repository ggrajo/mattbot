import logging
from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user, require_step_up
from app.database import get_db
from app.models.user import User
from app.schemas.common import MessageResponse
from app.services import audit_service, mfa_service, telephony_service
from app.services.billing_service import _get_subscription, cancel_subscription
from app.services.session_service import revoke_all_user_sessions

logger = logging.getLogger(__name__)

router = APIRouter()


class UserProfileResponse(BaseModel):
    id: str
    email: str | None
    email_verified: bool
    status: str
    display_name: str | None
    nickname: str | None
    company_name: str | None
    role_title: str | None
    ai_greeting_instructions: str | None
    default_timezone: str
    language_code: str
    mfa_enabled: bool
    has_password: bool
    created_at: str


class UserProfileUpdateRequest(BaseModel):
    display_name: str | None = None
    nickname: str | None = None
    company_name: str | None = None
    role_title: str | None = None
    ai_greeting_instructions: str | None = None
    default_timezone: str | None = None
    language_code: str | None = None


@router.get("", response_model=UserProfileResponse)
async def get_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    mfa_enabled = await mfa_service.has_active_totp(db, current_user.user_id)
    user = current_user.user
    return _build_profile_response(user, mfa_enabled)


@router.patch("", response_model=UserProfileResponse)
async def update_profile(
    body: UserProfileUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    user = current_user.user
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.nickname is not None:
        user.nickname = body.nickname
    if body.company_name is not None:
        user.company_name = body.company_name
    if body.role_title is not None:
        user.role_title = body.role_title
    if body.ai_greeting_instructions is not None:
        user.ai_greeting_instructions = body.ai_greeting_instructions
    if body.default_timezone is not None:
        user.default_timezone = body.default_timezone
    if body.language_code is not None:
        user.language_code = body.language_code
    await db.flush()

    mfa_enabled = await mfa_service.has_active_totp(db, current_user.user_id)
    return _build_profile_response(user, mfa_enabled)


def _build_profile_response(user: "User", mfa_enabled: bool) -> UserProfileResponse:
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        email_verified=user.email_verified,
        status=user.status,
        display_name=user.display_name,
        nickname=user.nickname,
        company_name=user.company_name,
        role_title=user.role_title,
        ai_greeting_instructions=user.ai_greeting_instructions,
        default_timezone=user.default_timezone,
        language_code=user.language_code,
        mfa_enabled=mfa_enabled,
        has_password=user.password_hash is not None,
        created_at=user.created_at.isoformat(),
    )


@router.post("/delete-account", response_model=MessageResponse)
async def delete_account(
    current_user: CurrentUser = Depends(get_current_user),
    step_up: dict = Depends(require_step_up),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    user_id = current_user.user_id
    user = current_user.user

    # Release Twilio number if any
    await telephony_service.release_number(
        db,
        user_id,
        reason="account_deletion",
    )

    # Cancel subscription if active
    sub = await _get_subscription(db, user_id)
    if sub and sub.status in ("active", "past_due", "trialing"):
        try:
            await cancel_subscription(db, user_id)
        except Exception:
            logger.debug("Cancel subscription best-effort failed", exc_info=True)

    # Mark user as deleted
    user.status = "deleted"
    user.deleted_at = datetime.now(UTC)

    # Revoke all sessions
    await revoke_all_user_sessions(
        db,
        user_id,
        reason="account_deleted",
    )

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="ACCOUNT_DELETED",
    )
    await db.flush()

    return MessageResponse(message="Account deleted successfully")

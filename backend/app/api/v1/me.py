from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.services import mfa_service

router = APIRouter()


class UserProfileResponse(BaseModel):
    id: str
    email: str | None
    email_verified: bool
    status: str
    display_name: str | None
    default_timezone: str
    language_code: str
    mfa_enabled: bool
    created_at: str


class UserProfileUpdateRequest(BaseModel):
    display_name: str | None = None
    default_timezone: str | None = None
    language_code: str | None = None


@router.get("", response_model=UserProfileResponse)
async def get_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    mfa_enabled = await mfa_service.has_active_totp(db, current_user.user_id)
    user = current_user.user
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        email_verified=user.email_verified,
        status=user.status,
        display_name=user.display_name,
        default_timezone=user.default_timezone,
        language_code=user.language_code,
        mfa_enabled=mfa_enabled,
        created_at=user.created_at.isoformat(),
    )


@router.patch("", response_model=UserProfileResponse)
async def update_profile(
    body: UserProfileUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserProfileResponse:
    user = current_user.user
    if body.display_name is not None:
        user.display_name = body.display_name
    if body.default_timezone is not None:
        user.default_timezone = body.default_timezone
    if body.language_code is not None:
        user.language_code = body.language_code
    await db.flush()

    mfa_enabled = await mfa_service.has_active_totp(db, current_user.user_id)
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        email_verified=user.email_verified,
        status=user.status,
        display_name=user.display_name,
        default_timezone=user.default_timezone,
        language_code=user.language_code,
        mfa_enabled=mfa_enabled,
        created_at=user.created_at.isoformat(),
    )

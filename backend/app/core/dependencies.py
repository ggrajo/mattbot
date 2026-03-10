"""FastAPI dependencies for auth, session validation, step-up enforcement."""

import uuid
from datetime import UTC, datetime

import jwt as pyjwt
from fastapi import Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.clock import utcnow
from app.core.jwt_utils import decode_token
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.session import Session
from app.models.user import User


async def get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "0.0.0.0"  # noqa: S104


async def get_request_id(request: Request) -> str:
    return getattr(request.state, "request_id", "unknown")


class CurrentUser:
    def __init__(self, user: User, session: Session, device_id: uuid.UUID):
        self.user = user
        self.session = session
        self.device_id = device_id
        self.user_id = user.id


async def _resolve_user_from_token(
    token: str,
    db: AsyncSession,
) -> CurrentUser:
    """Shared logic: validate a Bearer token and return CurrentUser."""
    try:
        payload = decode_token(token, expected_type="access")
    except pyjwt.ExpiredSignatureError:
        raise AppError("TOKEN_EXPIRED", "Access token has expired", 401) from None
    except pyjwt.InvalidTokenError:
        raise AppError("INVALID_TOKEN", "Invalid access token", 401) from None

    session_id = uuid.UUID(payload["sid"])
    user_id = uuid.UUID(payload["sub"])

    session = await db.get(Session, session_id)
    if session is None or session.revoked_at is not None:
        raise AppError("SESSION_REVOKED", "Session is no longer valid", 401)

    if session.owner_user_id != user_id:
        raise AppError("INVALID_TOKEN", "Token session mismatch", 401)

    now = utcnow()

    access_exp = session.access_expires_at
    if access_exp < now:
        raise AppError("TOKEN_EXPIRED", "Access token has expired", 401)

    created = session.created_at
    absolute_age = (now - created).days
    if absolute_age > settings.ABSOLUTE_SESSION_DAYS:
        raise AppError("SESSION_EXPIRED", "Session has exceeded maximum age", 401)

    user = await db.get(User, user_id)
    if user is None:
        raise AppError("USER_NOT_FOUND", "User not found", 401)
    if user.status in ("deleted", "locked"):
        raise AppError("ACCOUNT_DISABLED", "Account is disabled", 401)

    return CurrentUser(
        user=user,
        session=session,
        device_id=uuid.UUID(payload["did"]),
    )


async def get_current_user(
    authorization: str = Header(..., alias="Authorization"),
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    if not authorization.startswith("Bearer "):
        raise AppError("INVALID_TOKEN", "Invalid authorization header", 401)
    return await _resolve_user_from_token(authorization[7:], db)


async def get_current_user_from_query(
    token: str,
    db: AsyncSession = Depends(get_db),
) -> CurrentUser:
    """Authenticate via ?token= query parameter (for media streaming endpoints)."""
    if not token:
        raise AppError("INVALID_TOKEN", "Token query parameter required", 401)
    return await _resolve_user_from_token(token, db)


async def require_step_up(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Validate a step-up token from the X-Step-Up-Token header.

    Verifies the step-up token's ``sub`` matches the authenticated user
    to prevent cross-user privilege escalation.
    """
    step_up_token = request.headers.get("X-Step-Up-Token")
    if not step_up_token:
        raise AppError("STEP_UP_REQUIRED", "This action requires step-up authentication", 403)

    try:
        payload = decode_token(step_up_token, expected_type="step_up")
    except pyjwt.ExpiredSignatureError:
        raise AppError("STEP_UP_EXPIRED", "Step-up token has expired", 403) from None
    except pyjwt.InvalidTokenError:
        raise AppError("STEP_UP_INVALID", "Invalid step-up token", 403) from None

    if payload.get("sub") != str(current_user.user_id):
        raise AppError("STEP_UP_INVALID", "Step-up token does not match authenticated user", 403)

    return payload

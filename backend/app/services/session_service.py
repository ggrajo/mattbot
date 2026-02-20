import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.jwt_utils import create_access_token
from app.core.security import generate_token, hash_token
from app.models.session import Session
from app.services import audit_service


class TokenPair:
    def __init__(self, access_token: str, refresh_token: str, session_id: uuid.UUID):
        self.access_token = access_token
        self.refresh_token = refresh_token
        self.session_id = session_id


async def create_session(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    device_id: uuid.UUID,
    ip: str | None = None,
    user_agent: str | None = None,
) -> TokenPair:
    now = datetime.now(UTC)

    refresh_raw = generate_token(32)
    refresh_hash = hash_token(refresh_raw)
    access_expires = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_MINUTES)
    refresh_expires = now + timedelta(days=settings.REFRESH_TOKEN_DAYS)

    session = Session(
        owner_user_id=user_id,
        device_id=device_id,
        access_token_id=uuid.uuid4(),
        access_token_hash=hash_token("placeholder"),
        access_expires_at=access_expires,
        refresh_token_hash=refresh_hash,
        refresh_expires_at=refresh_expires,
        ip_created=ip,
        ip_last=ip,
        user_agent=user_agent,
    )
    db.add(session)
    await db.flush()

    access_token = create_access_token(user_id, session.id, device_id)
    session.access_token_hash = hash_token(access_token)
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="session.created",
        actor_id=device_id,
        target_type="session",
        target_id=session.id,
        ip=ip,
    )

    return TokenPair(
        access_token=access_token,
        refresh_token=refresh_raw,
        session_id=session.id,
    )


async def refresh_session(
    db: AsyncSession,
    *,
    refresh_token: str,
    ip: str | None = None,
) -> TokenPair:
    token_hash = hash_token(refresh_token)

    result = await db.execute(
        select(Session).where(Session.refresh_token_hash == token_hash)
    )
    session = result.scalar_one_or_none()

    if session is None:
        raise ValueError("Invalid refresh token")

    if session.revoked_at is not None:
        raise ValueError("Session has been revoked")

    now = datetime.now(UTC)
    if session.refresh_expires_at.replace(tzinfo=UTC) < now:
        raise ValueError("Refresh token has expired")

    absolute_age = (now - session.created_at.replace(tzinfo=UTC)).days
    if absolute_age > settings.ABSOLUTE_SESSION_DAYS:
        raise ValueError("Session exceeded maximum age")

    from app.models.device import Device
    device = await db.get(Device, session.device_id)
    if device is None or device.revoked_at is not None:
        session.revoked_at = now
        session.revoke_reason = "device_revoked"
        await db.flush()
        raise ValueError("Device has been revoked")

    from app.models.user import User
    user = await db.get(User, session.owner_user_id)
    if user is None or user.status in ("deleted", "locked"):
        raise ValueError("Account is disabled")

    session.revoked_at = now
    session.revoke_reason = "rotated"

    new_refresh_raw = generate_token(32)
    new_refresh_hash = hash_token(new_refresh_raw)
    access_expires = now + timedelta(minutes=settings.JWT_ACCESS_TOKEN_MINUTES)
    refresh_expires = now + timedelta(days=settings.REFRESH_TOKEN_DAYS)

    new_session = Session(
        owner_user_id=session.owner_user_id,
        device_id=session.device_id,
        access_token_id=uuid.uuid4(),
        access_token_hash=hash_token("placeholder"),
        access_expires_at=access_expires,
        refresh_token_hash=new_refresh_hash,
        refresh_expires_at=refresh_expires,
        last_refresh_at=now,
        ip_created=session.ip_created,
        ip_last=ip,
        user_agent=session.user_agent,
    )
    db.add(new_session)
    await db.flush()

    access_token = create_access_token(
        session.owner_user_id, new_session.id, session.device_id
    )
    new_session.access_token_hash = hash_token(access_token)
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=session.owner_user_id,
        event_type="session.refreshed",
        target_type="session",
        target_id=new_session.id,
        ip=ip,
    )

    return TokenPair(
        access_token=access_token,
        refresh_token=new_refresh_raw,
        session_id=new_session.id,
    )


async def revoke_session(
    db: AsyncSession,
    session: Session,
    reason: str = "logout",
) -> None:
    session.revoked_at = datetime.now(UTC)
    session.revoke_reason = reason
    await db.flush()


async def revoke_all_user_sessions(
    db: AsyncSession,
    user_id: uuid.UUID,
    reason: str = "logout_all",
    *,
    ip: str | None = None,
) -> int:
    now = datetime.now(UTC)
    result = await db.execute(
        update(Session)
        .where(Session.owner_user_id == user_id, Session.revoked_at.is_(None))
        .values(revoked_at=now, revoke_reason=reason)
    )
    count = result.rowcount or 0

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="user.logout_all",
        ip=ip,
        details={"sessions_revoked": count, "reason": reason},
    )

    return count

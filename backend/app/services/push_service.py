import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.push_token import PushToken
from app.services import audit_service


async def register_push_token(
    db: AsyncSession,
    *,
    device_id: uuid.UUID,
    owner_user_id: uuid.UUID,
    provider: str,
    token: str,
) -> PushToken:
    now = datetime.now(UTC)

    # Revoke any existing active entries for this device+provider
    await db.execute(
        update(PushToken)
        .where(
            PushToken.device_id == device_id,
            PushToken.provider == provider,
            PushToken.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )

    # Also revoke any other device holding the same token value
    await db.execute(
        update(PushToken)
        .where(
            PushToken.provider == provider,
            PushToken.token == token,
            PushToken.revoked_at.is_(None),
        )
        .values(revoked_at=now)
    )

    push_token = PushToken(
        device_id=device_id,
        provider=provider,
        token=token,
    )
    db.add(push_token)
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=owner_user_id,
        event_type="push_token.registered",
        target_type="push_token",
        target_id=push_token.id,
    )
    return push_token


async def get_active_push_tokens(
    db: AsyncSession, device_id: uuid.UUID
) -> list[PushToken]:
    result = await db.execute(
        select(PushToken).where(
            PushToken.device_id == device_id, PushToken.revoked_at.is_(None)
        )
    )
    return list(result.scalars().all())

import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.device import Device
from app.models.push_token import PushToken
from app.models.session import Session
from app.services import audit_service


async def create_or_get_device(
    db: AsyncSession,
    *,
    owner_user_id: uuid.UUID,
    platform: str,
    device_name: str | None = None,
    app_version: str | None = None,
    os_version: str | None = None,
    last_ip: str | None = None,
) -> Device:
    device = Device(
        owner_user_id=owner_user_id,
        platform=platform,
        device_name=device_name,
        app_version=app_version,
        os_version=os_version,
        last_ip=last_ip,
        last_seen_at=datetime.now(UTC),
    )
    db.add(device)
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=owner_user_id,
        event_type="device.registered",
        target_type="device",
        target_id=device.id,
        details={"platform": platform},
    )
    return device


async def update_device(
    db: AsyncSession,
    device: Device,
    *,
    device_name: str | None = None,
    app_version: str | None = None,
    os_version: str | None = None,
    last_ip: str | None = None,
) -> Device:
    if device_name is not None:
        device.device_name = device_name
    if app_version is not None:
        device.app_version = app_version
    if os_version is not None:
        device.os_version = os_version
    if last_ip is not None:
        device.last_ip = last_ip
    device.last_seen_at = datetime.now(UTC)
    await db.flush()
    return device


async def list_user_devices(
    db: AsyncSession, owner_user_id: uuid.UUID
) -> list[Device]:
    result = await db.execute(
        select(Device)
        .where(Device.owner_user_id == owner_user_id, Device.revoked_at.is_(None))
        .order_by(Device.created_at.desc())
    )
    return list(result.scalars().all())


async def get_device(
    db: AsyncSession, device_id: uuid.UUID, owner_user_id: uuid.UUID
) -> Device | None:
    result = await db.execute(
        select(Device).where(
            Device.id == device_id, Device.owner_user_id == owner_user_id
        )
    )
    return result.scalar_one_or_none()


async def revoke_device(
    db: AsyncSession,
    device: Device,
    reason: str = "user_revoked",
    *,
    ip: str | None = None,
) -> None:
    now = datetime.now(UTC)
    device.revoked_at = now
    device.revoke_reason = reason

    await db.execute(
        update(Session)
        .where(Session.device_id == device.id, Session.revoked_at.is_(None))
        .values(revoked_at=now, revoke_reason="device_revoked")
    )

    await db.execute(
        update(PushToken)
        .where(PushToken.device_id == device.id, PushToken.revoked_at.is_(None))
        .values(revoked_at=now)
    )

    await audit_service.log_event(
        db,
        owner_user_id=device.owner_user_id,
        event_type="device.revoked",
        target_type="device",
        target_id=device.id,
        ip=ip,
        details={"reason": reason},
    )

    await db.flush()

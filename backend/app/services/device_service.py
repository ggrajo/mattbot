import logging
import uuid
from datetime import UTC, datetime

import httpx
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.clock import utcnow
from app.models.device import Device
from app.models.push_token import PushToken
from app.models.session import Session
from app.services import audit_service

logger = logging.getLogger(__name__)


async def _geolocate_ip(ip: str | None) -> str | None:
    """Best-effort IP geolocation via ip-api.com (free, no key needed)."""
    if not ip or ip.startswith("127.") or ip.startswith("10.") or ip.startswith("192.168.") or ip == "::1":
        return None
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            resp = await client.get(f"http://ip-api.com/json/{ip}?fields=status,city,regionName,country")
            if resp.status_code == 200:
                data = resp.json()
                if data.get("status") == "success":
                    parts = [p for p in [data.get("city"), data.get("regionName"), data.get("country")] if p]
                    return ", ".join(parts) if parts else None
    except Exception:
        logger.debug("IP geolocation failed for %s", ip, exc_info=True)
    return None


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
    existing = (
        await db.execute(
            select(Device)
            .where(
                Device.owner_user_id == owner_user_id,
                Device.platform == platform,
                Device.revoked_at.is_(None),
            )
            .order_by(Device.last_seen_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    if existing is not None:
        return await update_device(
            db, existing,
            device_name=device_name,
            app_version=app_version,
            os_version=os_version,
            last_ip=last_ip,
        )

    location = await _geolocate_ip(last_ip)
    device = Device(
        owner_user_id=owner_user_id,
        platform=platform,
        device_name=device_name,
        app_version=app_version,
        os_version=os_version,
        last_ip=last_ip,
        last_location=location,
        last_seen_at=utcnow(),
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
        location = await _geolocate_ip(last_ip)
        if location:
            device.last_location = location
    device.last_seen_at = utcnow()
    await db.flush()
    return device


async def list_user_devices(db: AsyncSession, owner_user_id: uuid.UUID) -> list[Device]:
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
        select(Device).where(Device.id == device_id, Device.owner_user_id == owner_user_id)
    )
    return result.scalar_one_or_none()


async def revoke_device(
    db: AsyncSession,
    device: Device,
    reason: str = "user_revoked",
    *,
    ip: str | None = None,
) -> None:
    now = utcnow()
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

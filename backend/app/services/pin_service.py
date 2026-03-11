"""PIN login service: setup, verification, lockout, and cleanup."""

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.clock import utcnow
from app.core.security import hash_password, verify_password
from app.middleware.error_handler import AppError
from app.models.device import Device
from app.models.user import User
from app.services import audit_service, email_service
from app.services.session_service import create_session


async def setup_pin(
    db: AsyncSession,
    user: User,
    device: Device,
    pin: str,
    *,
    ip: str | None = None,
) -> None:
    if len(pin) != settings.PIN_LENGTH or not pin.isdigit():
        raise AppError("INVALID_PIN", f"PIN must be exactly {settings.PIN_LENGTH} digits", 400)

    device.pin_hash = hash_password(pin)
    device.pin_failed_attempts = 0
    device.pin_locked_until = None
    device.pin_set_at = utcnow()

    await audit_service.log_event(
        db,
        owner_user_id=user.id,
        event_type="pin.setup",
        actor_id=device.id,
        target_type="device",
        target_id=device.id,
        ip=ip,
    )

    await db.flush()


async def disable_pin(
    db: AsyncSession,
    user: User,
    device: Device,
    *,
    ip: str | None = None,
    reason: str = "user_disabled",
) -> None:
    device.pin_hash = None
    device.pin_failed_attempts = 0
    device.pin_locked_until = None
    device.pin_set_at = None

    await audit_service.log_event(
        db,
        owner_user_id=user.id,
        event_type="pin.disabled",
        actor_id=device.id,
        target_type="device",
        target_id=device.id,
        ip=ip,
        details={"reason": reason},
    )

    await db.flush()


async def verify_pin_and_login(
    db: AsyncSession,
    device_id: uuid.UUID,
    pin: str,
    *,
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    device = await db.get(Device, device_id)
    if device is None or device.revoked_at:
        hash_password("dummy-timing-defense")
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    if not device.pin_hash:
        hash_password("dummy-timing-defense")
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    user = await db.get(User, device.owner_user_id)
    if user is None or user.status in ("deleted", "locked"):
        hash_password("dummy-timing-defense")
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    now = utcnow()

    if device.pin_locked_until is not None:
        locked_until = device.pin_locked_until
        if now < locked_until:
            remaining = int((locked_until - now).total_seconds())
            raise AppError(
                "PIN_COOLDOWN",
                f"Too many attempts. Try again in {remaining} seconds.",
                429,
            )

    if device.pin_failed_attempts >= settings.PIN_MAX_ATTEMPTS:
        await _permanently_lock_pin(db, device=device, user=user, ip=ip)
        raise AppError(
            "PIN_PERMANENTLY_LOCKED",
            "PIN has been disabled due to too many failed attempts. "
            "Please sign in normally and set up a new PIN.",
            401,
        )

    if not verify_password(pin, device.pin_hash):
        device.pin_failed_attempts += 1
        attempts = device.pin_failed_attempts

        if attempts >= settings.PIN_MAX_ATTEMPTS:
            await _permanently_lock_pin(db, device=device, user=user, ip=ip)
            raise AppError(
                "PIN_PERMANENTLY_LOCKED",
                "PIN has been disabled due to too many failed attempts. "
                "Please sign in normally and set up a new PIN.",
                401,
            )

        cooldown_idx = min(attempts, len(settings.PIN_COOLDOWN_SCHEDULE) - 1)
        cooldown_secs = settings.PIN_COOLDOWN_SCHEDULE[cooldown_idx]
        if cooldown_secs > 0:
            device.pin_locked_until = now + timedelta(seconds=cooldown_secs)

        remaining = settings.PIN_MAX_ATTEMPTS - attempts

        await audit_service.log_event(
            db,
            owner_user_id=user.id,
            event_type="pin.login.failed",
            actor_id=device.id,
            ip=ip,
            details={"attempts": attempts, "remaining": remaining},
        )

        await db.flush()

        raise AppError(
            "INVALID_CREDENTIALS",
            f"Invalid PIN. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
            401,
        )

    device.pin_failed_attempts = 0
    device.pin_locked_until = None

    tokens = await create_session(
        db,
        user_id=user.id,
        device_id=device.id,
        ip=ip,
        user_agent=user_agent,
    )

    await audit_service.log_event(
        db,
        owner_user_id=user.id,
        event_type="pin.login.success",
        actor_id=device.id,
        ip=ip,
    )

    return {
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "token_type": "bearer",
    }


async def _permanently_lock_pin(
    db: AsyncSession,
    *,
    device: Device,
    user: User,
    ip: str | None = None,
) -> None:
    device.pin_hash = None
    device.pin_failed_attempts = 0
    device.pin_locked_until = None
    device.pin_set_at = None

    await audit_service.log_event(
        db,
        owner_user_id=user.id,
        event_type="pin.locked_out",
        actor_id=device.id,
        target_type="device",
        target_id=device.id,
        ip=ip,
    )

    await db.flush()

    if user.email:
        await email_service.send_security_notification(
            user.email,
            "Your PIN login has been disabled due to too many failed attempts. "
            "If this was not you, please sign in and change your password immediately.",
        )

"""Core authentication service: registration, login, OAuth, email verify, password reset."""

import json
import logging
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.clock import utcnow
from app.core.jwt_utils import create_partial_token
from app.core.oauth import OAuthUserInfo
from app.core.rate_limiter import _get_redis
from app.core.security import (
    check_needs_rehash,
    generate_token,
    hash_password,
    hash_token,
    is_common_password,
    verify_password,
)
from app.middleware.error_handler import AppError
from app.models.auth_identity import AuthIdentity
from app.models.user import User
from app.services import audit_service, email_service
from app.services.device_service import create_or_get_device
from app.services.mfa_service import has_active_totp
from app.services.session_service import create_session, revoke_all_user_sessions

logger = logging.getLogger(__name__)

_VERIFY_PREFIX = "verify_token:"
_RESET_PREFIX = "reset_token:"
_EMAIL_OTP_PREFIX = "email_otp:"


async def _store_token(prefix: str, token_hash: str, data: dict, ttl_seconds: int) -> None:
    r = await _get_redis()
    payload = json.dumps(data, default=str)
    if r is not None:
        await r.setex(f"{prefix}{token_hash}", ttl_seconds, payload)
    else:
        _memory_fallback[f"{prefix}{token_hash}"] = (
            payload,
            utcnow() + timedelta(seconds=ttl_seconds),
        )


async def _get_token(prefix: str, token_hash: str) -> dict[str, str] | None:
    r = await _get_redis()
    if r is not None:
        val = await r.get(f"{prefix}{token_hash}")
        if val is None:
            return None
        result: dict[str, str] = json.loads(val)
        return result
    else:
        entry = _memory_fallback.get(f"{prefix}{token_hash}")
        if entry is None:
            return None
        payload, expires = entry
        if utcnow() > expires:
            _memory_fallback.pop(f"{prefix}{token_hash}", None)
            return None
        result = json.loads(payload)
        return result


async def _delete_token(prefix: str, token_hash: str) -> None:
    r = await _get_redis()
    if r is not None:
        await r.delete(f"{prefix}{token_hash}")
    else:
        _memory_fallback.pop(f"{prefix}{token_hash}", None)


_memory_fallback: dict[str, tuple[str, datetime]] = {}


def _validate_password(password: str) -> None:
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        raise AppError(
            "WEAK_PASSWORD",
            f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters",
            400,
        )
    if len(password) > settings.PASSWORD_MAX_LENGTH:
        raise AppError(
            "WEAK_PASSWORD",
            f"Password must be at most {settings.PASSWORD_MAX_LENGTH} characters",
            400,
        )
    if is_common_password(password):
        raise AppError(
            "WEAK_PASSWORD",
            "This password is too common. Please choose a different one.",
            400,
        )


async def register_with_email(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    platform: str,
    device_name: str | None = None,
    app_version: str | None = None,
    os_version: str | None = None,
    ip: str | None = None,
) -> dict:
    _validate_password(password)

    existing = await db.execute(select(User).where(User.email == email.lower()))
    if existing.scalar_one_or_none() is not None:
        raise AppError("EMAIL_TAKEN", "An account with this email already exists. Please sign in instead.", 409)

    user = User(
        email=email.lower(),
        email_verified=False,
        password_hash=hash_password(password),
        status="pending_verification",
        default_timezone="UTC",
        language_code="en",
    )
    db.add(user)
    await db.flush()

    identity = AuthIdentity(
        owner_user_id=user.id,
        provider="email_password",
        provider_subject=email.lower(),
        provider_email=email.lower(),
        provider_email_verified=False,
    )
    db.add(identity)

    device = await create_or_get_device(
        db,
        owner_user_id=user.id,
        platform=platform,
        device_name=device_name,
        app_version=app_version,
        os_version=os_version,
    )

    verification_token = generate_token(32)
    await _store_token(
        _VERIFY_PREFIX,
        hash_token(verification_token),
        {"user_id": str(user.id)},
        ttl_seconds=settings.EMAIL_VERIFY_TOKEN_TTL,
    )

    await audit_service.log_event(db, owner_user_id=user.id, event_type="user.registered", ip=ip)

    await db.flush()

    try:
        await email_service.send_verification_email(email, verification_token)
    except Exception:
        logger.exception("Failed to send verification email to %s – registration still committed", email)

    return {
        "user_id": str(user.id),
        "device_id": str(device.id),
        "status": "pending_verification",
    }


async def verify_email(db: AsyncSession, token: str) -> dict:
    token_hash = hash_token(token)
    entry = await _get_token(_VERIFY_PREFIX, token_hash)
    if entry is None:
        raise AppError("INVALID_TOKEN", "Invalid or expired verification token", 400)

    await _delete_token(_VERIFY_PREFIX, token_hash)

    user_id = uuid.UUID(entry["user_id"])
    user = await db.get(User, user_id)
    if user is None:
        raise AppError("USER_NOT_FOUND", "User not found", 404)

    user.email_verified = True
    if user.status == "pending_verification":
        user.status = "active"

    identity_result = await db.execute(
        select(AuthIdentity).where(
            AuthIdentity.owner_user_id == user_id,
            AuthIdentity.provider == "email_password",
        )
    )
    identity = identity_result.scalar_one_or_none()
    if identity:
        identity.provider_email_verified = True

    await audit_service.log_event(db, owner_user_id=user_id, event_type="user.email_verified")
    await db.flush()

    return {"status": user.status}


async def login_with_email(
    db: AsyncSession,
    *,
    email: str,
    password: str,
    platform: str,
    device_name: str | None = None,
    app_version: str | None = None,
    os_version: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    user = (await db.execute(select(User).where(User.email == email.lower()))).scalar_one_or_none()

    if user is None:
        hash_password("dummy-to-prevent-timing-attack")
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    if user.status == "locked":
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)
    if user.status == "deleted":
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    if user.password_hash is None or not verify_password(password, user.password_hash):
        await audit_service.log_event(
            db, owner_user_id=user.id, event_type="user.login.failed", ip=ip
        )
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    if check_needs_rehash(user.password_hash):
        user.password_hash = hash_password(password)

    device = await create_or_get_device(
        db,
        owner_user_id=user.id,
        platform=platform,
        device_name=device_name,
        app_version=app_version,
        os_version=os_version,
    )

    mfa_enrolled = await has_active_totp(db, user.id)

    if mfa_enrolled:
        challenge_token = create_partial_token(
            user.id,
            device.id,
            "mfa_challenge",
            expires_minutes=settings.MFA_CHALLENGE_EXPIRY_MINUTES,
        )
        return {
            "requires_mfa": True,
            "mfa_challenge_token": challenge_token,
        }
    else:
        partial_token = create_partial_token(
            user.id,
            device.id,
            "mfa_enrollment",
            expires_minutes=settings.MFA_CHALLENGE_EXPIRY_MINUTES,
        )
        return {
            "requires_mfa_enrollment": True,
            "partial_token": partial_token,
        }


async def login_complete_mfa(
    db: AsyncSession,
    *,
    user_id: uuid.UUID,
    device_id: uuid.UUID,
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    tokens = await create_session(
        db, user_id=user_id, device_id=device_id, ip=ip, user_agent=user_agent
    )

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="user.login.success",
        actor_id=device_id,
        ip=ip,
    )

    return {
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "token_type": "bearer",
    }


async def handle_oauth_login(
    db: AsyncSession,
    *,
    user_info: OAuthUserInfo,
    platform: str,
    device_name: str | None = None,
    app_version: str | None = None,
    os_version: str | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
) -> dict:
    identity_result = await db.execute(
        select(AuthIdentity).where(
            AuthIdentity.provider == user_info.provider,
            AuthIdentity.provider_subject == user_info.subject,
        )
    )
    existing_identity = identity_result.scalar_one_or_none()

    if existing_identity is not None:
        user = await db.get(User, existing_identity.owner_user_id)
        if user is None or user.status in ("deleted", "locked"):
            raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

        device = await create_or_get_device(
            db,
            owner_user_id=user.id,
            platform=platform,
            device_name=device_name,
            app_version=app_version,
            os_version=os_version,
        )

        mfa_enrolled = await has_active_totp(db, user.id)
        if mfa_enrolled:
            challenge_token = create_partial_token(
                user.id,
                device.id,
                "mfa_challenge",
                expires_minutes=settings.MFA_CHALLENGE_EXPIRY_MINUTES,
            )
            return {"requires_mfa": True, "mfa_challenge_token": challenge_token}
        else:
            partial_token = create_partial_token(
                user.id,
                device.id,
                "mfa_enrollment",
                expires_minutes=settings.MFA_CHALLENGE_EXPIRY_MINUTES,
            )
            return {"requires_mfa_enrollment": True, "partial_token": partial_token}

    if user_info.email:
        email_user_result = await db.execute(
            select(User).where(User.email == user_info.email.lower())
        )
        email_user = email_user_result.scalar_one_or_none()

        if email_user is not None:
            await audit_service.log_event(
                db,
                owner_user_id=email_user.id,
                event_type="oauth.link_attempt_blocked",
                ip=ip,
                details={"provider": user_info.provider},
            )
            raise AppError(
                "LINKING_REQUIRED",
                "An account with this email already exists. Please sign in with your "
                "existing method first to link this provider.",
                409,
            )

    user = User(
        email=user_info.email.lower() if user_info.email else None,
        email_verified=user_info.email_verified,
        status="active" if user_info.email_verified else "pending_verification",
    )
    db.add(user)
    await db.flush()

    identity = AuthIdentity(
        owner_user_id=user.id,
        provider=user_info.provider,
        provider_subject=user_info.subject,
        provider_email=user_info.email.lower() if user_info.email else None,
        provider_email_verified=user_info.email_verified,
    )
    db.add(identity)

    device = await create_or_get_device(
        db,
        owner_user_id=user.id,
        platform=platform,
        device_name=device_name,
        app_version=app_version,
        os_version=os_version,
    )

    event_type = f"oauth.{user_info.provider}.linked"
    await audit_service.log_event(db, owner_user_id=user.id, event_type=event_type, ip=ip)

    partial_token = create_partial_token(
        user.id, device.id, "mfa_enrollment", expires_minutes=settings.MFA_CHALLENGE_EXPIRY_MINUTES
    )
    return {"requires_mfa_enrollment": True, "partial_token": partial_token}


async def request_password_reset(db: AsyncSession, email: str) -> None:
    """Always returns success to prevent email enumeration."""
    user = (await db.execute(select(User).where(User.email == email.lower()))).scalar_one_or_none()

    if user is None:
        return

    token = generate_token(32)
    await _store_token(
        _RESET_PREFIX,
        hash_token(token),
        {"user_id": str(user.id)},
        ttl_seconds=settings.PASSWORD_RESET_TOKEN_TTL,
    )

    await audit_service.log_event(
        db, owner_user_id=user.id, event_type="user.password.reset_requested"
    )

    await email_service.send_password_reset_email(email, token)


async def confirm_password_reset(
    db: AsyncSession,
    *,
    token: str,
    new_password: str,
    platform: str = "web",
    device_name: str | None = None,
    ip: str | None = None,
) -> dict:
    _validate_password(new_password)

    token_hash = hash_token(token)
    entry = await _get_token(_RESET_PREFIX, token_hash)
    if entry is None:
        raise AppError("INVALID_TOKEN", "Invalid or expired reset token", 400)

    await _delete_token(_RESET_PREFIX, token_hash)

    user_id = uuid.UUID(entry["user_id"])
    user = await db.get(User, user_id)
    if user is None:
        raise AppError("USER_NOT_FOUND", "User not found", 404)

    user.password_hash = hash_password(new_password)
    await revoke_all_user_sessions(db, user_id, reason="password_reset", ip=ip)

    await audit_service.log_event(
        db, owner_user_id=user_id, event_type="user.password.reset_completed", ip=ip
    )

    device = await create_or_get_device(
        db, owner_user_id=user_id, platform=platform, device_name=device_name
    )

    mfa_enrolled = await has_active_totp(db, user_id)
    if mfa_enrolled:
        challenge_token = create_partial_token(
            user_id,
            device.id,
            "mfa_challenge",
            expires_minutes=settings.MFA_CHALLENGE_EXPIRY_MINUTES,
        )
        return {"requires_mfa": True, "mfa_challenge_token": challenge_token}

    return {"status": "password_reset_complete"}


async def change_password(
    db: AsyncSession,
    *,
    user: User,
    current_password: str | None,
    new_password: str,
    ip: str | None = None,
) -> None:
    _validate_password(new_password)

    if user.password_hash is not None:
        if not current_password:
            raise AppError(
                "CURRENT_PASSWORD_REQUIRED",
                "Current password is required",
                400,
            )
        if not verify_password(current_password, user.password_hash):
            raise AppError("INVALID_CREDENTIALS", "Current password is incorrect", 401)

    user.password_hash = hash_password(new_password)

    existing_identity = (
        await db.execute(
            select(AuthIdentity).where(
                AuthIdentity.owner_user_id == user.id,
                AuthIdentity.provider == "email_password",
            )
        )
    ).scalar_one_or_none()

    if existing_identity is None and user.email:
        identity = AuthIdentity(
            owner_user_id=user.id,
            provider="email_password",
            provider_subject=user.email.lower(),
            provider_email=user.email.lower(),
            provider_email_verified=user.email_verified,
        )
        db.add(identity)

    await revoke_all_user_sessions(
        db,
        user.id,
        reason="password_changed",
        ip=ip,
    )

    event_type = "user.password.set" if current_password is None else "user.password.changed"
    await audit_service.log_event(
        db,
        owner_user_id=user.id,
        event_type=event_type,
        ip=ip,
    )

    if user.email:
        try:
            await email_service.send_security_notification(
                user.email,
                "Your password has been changed. If you did not make this change, "
                "please reset your password immediately.",
            )
        except Exception:
            logger.warning("Failed to send password change email to %s", user.email, exc_info=True)

    await db.flush()


async def store_email_otp(db: AsyncSession, email: str, otp: str, user_id: uuid.UUID) -> None:
    otp_hash = hash_token(otp)
    await _store_token(
        _EMAIL_OTP_PREFIX,
        email.lower(),
        {"otp_hash": otp_hash, "user_id": str(user_id)},
        ttl_seconds=settings.EMAIL_OTP_TTL,
    )


async def verify_email_otp(db: AsyncSession, email: str, otp: str) -> uuid.UUID | None:
    entry = await _get_token(_EMAIL_OTP_PREFIX, email.lower())
    if entry is None:
        return None

    if hash_token(otp) != entry["otp_hash"]:
        return None

    await _delete_token(_EMAIL_OTP_PREFIX, email.lower())
    return uuid.UUID(entry["user_id"])

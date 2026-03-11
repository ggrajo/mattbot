import uuid
from datetime import UTC, datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.encryption import decrypt_field, encrypt_field
from app.core.jwt_utils import create_partial_token
from app.core.security import (
    generate_recovery_codes,
    generate_totp_secret,
    get_totp_uri,
    hash_token,
    verify_totp,
)
from app.middleware.error_handler import AppError
from app.models.mfa_method import MfaMethod
from app.models.onboarding_state import OnboardingState
from app.models.recovery_code import RecoveryCode
from app.models.user_settings import UserSettings
from app.services import audit_service


async def start_totp_enrollment(
    db: AsyncSession,
    user_id: uuid.UUID,
    device_id: uuid.UUID,
    email: str,
) -> dict:
    secret = generate_totp_secret()
    qr_uri = get_totp_uri(secret, email)

    ciphertext, nonce, key_version = encrypt_field(secret.encode("utf-8"))

    mfa = MfaMethod(
        owner_user_id=user_id,
        method_type="totp",
        totp_secret_ciphertext=ciphertext,
        totp_secret_nonce=nonce,
        totp_secret_key_version=key_version,
        is_primary=True,
    )
    db.add(mfa)
    await db.flush()

    setup_token = create_partial_token(
        user_id,
        device_id,
        "mfa_setup",
        expires_minutes=settings.MFA_CHALLENGE_EXPIRY_MINUTES,
    )

    return {
        "secret": secret,
        "qr_uri": qr_uri,
        "mfa_setup_token": setup_token,
        "mfa_method_id": str(mfa.id),
    }


async def confirm_totp_enrollment(
    db: AsyncSession,
    user_id: uuid.UUID,
    totp_code: str,
) -> list[str]:
    result = await db.execute(
        select(MfaMethod).where(
            MfaMethod.owner_user_id == user_id,
            MfaMethod.method_type == "totp",
            MfaMethod.is_primary.is_(True),
            MfaMethod.enabled_at.is_(None),
        )
    )
    mfa = result.scalar_one_or_none()
    if mfa is None:
        raise AppError("MFA_NOT_FOUND", "No pending TOTP enrollment found", 400)

    secret = decrypt_field(
        mfa.totp_secret_ciphertext,  # type: ignore[arg-type]
        mfa.totp_secret_nonce,  # type: ignore[arg-type]
        mfa.totp_secret_key_version,  # type: ignore[arg-type]
    ).decode("utf-8")

    if not verify_totp(secret, totp_code):
        raise AppError("INVALID_TOTP", "Invalid TOTP code", 400)

    mfa.enabled_at = datetime.now(UTC)
    await db.flush()

    codes = await _generate_and_store_recovery_codes(db, user_id)

    await audit_service.log_event(db, owner_user_id=user_id, event_type="mfa.totp.enrolled")

    existing_settings = await db.get(UserSettings, user_id)
    if existing_settings is None:
        db.add(UserSettings(owner_user_id=user_id))
        await audit_service.log_event(db, owner_user_id=user_id, event_type="settings.created")

    existing_onboarding = await db.get(OnboardingState, user_id)
    if existing_onboarding is None:
        db.add(
            OnboardingState(
                owner_user_id=user_id,
                current_step="privacy_review",
                steps_completed=["account_created", "email_verified", "mfa_enrolled"],
            )
        )
    await db.flush()

    return codes


async def verify_totp_code(db: AsyncSession, user_id: uuid.UUID, code: str) -> bool:
    result = await db.execute(
        select(MfaMethod).where(
            MfaMethod.owner_user_id == user_id,
            MfaMethod.method_type == "totp",
            MfaMethod.is_primary.is_(True),
            MfaMethod.enabled_at.is_not(None),
            MfaMethod.disabled_at.is_(None),
        )
    )
    mfa = result.scalar_one_or_none()
    if mfa is None:
        return False

    secret = decrypt_field(
        mfa.totp_secret_ciphertext,  # type: ignore[arg-type]
        mfa.totp_secret_nonce,  # type: ignore[arg-type]
        mfa.totp_secret_key_version,  # type: ignore[arg-type]
    ).decode("utf-8")

    valid = verify_totp(secret, code)
    event_type = "mfa.totp.verified" if valid else "mfa.totp.failed"
    await audit_service.log_event(db, owner_user_id=user_id, event_type=event_type)
    return valid


async def verify_recovery_code(db: AsyncSession, user_id: uuid.UUID, code: str) -> bool:
    code_hash = hash_token(code.strip().upper())
    result = await db.execute(
        select(RecoveryCode).where(
            RecoveryCode.owner_user_id == user_id,
            RecoveryCode.code_hash == code_hash,
            RecoveryCode.used_at.is_(None),
        )
    )
    recovery = result.scalar_one_or_none()
    if recovery is None:
        return False

    recovery.used_at = datetime.now(UTC)
    await db.flush()

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="mfa.recovery_code.used",
        target_type="recovery_code",
        target_id=recovery.id,
    )
    return True


async def get_remaining_recovery_codes_count(db: AsyncSession, user_id: uuid.UUID) -> int:
    result = await db.execute(
        select(RecoveryCode).where(
            RecoveryCode.owner_user_id == user_id,
            RecoveryCode.used_at.is_(None),
        )
    )
    return len(result.scalars().all())


async def regenerate_recovery_codes(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    await db.execute(
        update(RecoveryCode)
        .where(RecoveryCode.owner_user_id == user_id, RecoveryCode.used_at.is_(None))
        .values(used_at=datetime.now(UTC))
    )

    codes = await _generate_and_store_recovery_codes(db, user_id)

    await audit_service.log_event(
        db, owner_user_id=user_id, event_type="mfa.recovery_codes.regenerated"
    )
    return codes


async def has_active_totp(db: AsyncSession, user_id: uuid.UUID) -> bool:
    result = await db.execute(
        select(MfaMethod).where(
            MfaMethod.owner_user_id == user_id,
            MfaMethod.method_type == "totp",
            MfaMethod.is_primary.is_(True),
            MfaMethod.enabled_at.is_not(None),
            MfaMethod.disabled_at.is_(None),
        )
    )
    return result.scalar_one_or_none() is not None


async def disable_all_mfa(db: AsyncSession, user_id: uuid.UUID) -> None:
    now = datetime.now(UTC)
    await db.execute(
        update(MfaMethod)
        .where(MfaMethod.owner_user_id == user_id, MfaMethod.disabled_at.is_(None))
        .values(disabled_at=now)
    )
    await audit_service.log_event(db, owner_user_id=user_id, event_type="mfa.reset_forced")


async def _generate_and_store_recovery_codes(db: AsyncSession, user_id: uuid.UUID) -> list[str]:
    codes = generate_recovery_codes(10)
    for code in codes:
        rc = RecoveryCode(
            owner_user_id=user_id,
            code_hash=hash_token(code),
        )
        db.add(rc)
    await db.flush()
    return codes

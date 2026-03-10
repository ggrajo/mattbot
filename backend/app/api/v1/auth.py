import uuid
from urllib.parse import quote

import jwt as pyjwt
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import (
    CurrentUser,
    get_client_ip,
    get_current_user,
    require_step_up,
)
from app.core.jwt_utils import create_partial_token, decode_token
from app.core.oauth import verify_apple_identity_token, verify_google_id_token
from app.core.rate_limiter import check_rate_limit, is_locked_out, set_lockout
from app.core.security import verify_password
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.auth import (
    EmailOtpRequestBody,
    EmailOtpVerifyRequest,
    EmailOtpVerifyResponse,
    EmailVerifyRequest,
    EmailVerifyResponse,
    LoginRequest,
    LoginResponse,
    MfaTotpConfirmRequest,
    MfaTotpConfirmResponse,
    MfaTotpStartResponse,
    MfaVerifyRequest,
    MfaVerifyResponse,
    OAuthAppleRequest,
    OAuthGoogleRequest,
    PasswordChangeRequest,
    PasswordChangeResponse,
    PasswordResetConfirmRequest,
    PasswordResetConfirmResponse,
    PasswordResetRequestBody,
    PinLoginRequest,
    PinSetupRequest,
    PinSetupResponse,
    PinStatusResponse,
    RecoveryCodesRevealResponse,
    RegisterRequest,
    RegisterResponse,
    StepUpRequest,
    StepUpResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
)
from app.schemas.common import MessageResponse
from app.services import audit_service, auth_service, email_service, mfa_service, pin_service
from app.services.session_service import (
    refresh_session,
    revoke_all_user_sessions,
    revoke_session,
)

router = APIRouter()


@router.post("/register", response_model=RegisterResponse, status_code=201)
async def register(
    body: RegisterRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> RegisterResponse:
    allowed, _ = await check_rate_limit(
        f"ip:register:{ip}",
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    result = await auth_service.register_with_email(
        db,
        email=body.email,
        password=body.password,
        platform=body.device.platform,
        device_name=body.device.device_name,
        app_version=body.device.app_version,
        os_version=body.device.os_version,
        ip=ip,
    )
    return RegisterResponse(user_id=result["user_id"], status=result["status"])


@router.post("/login", response_model=LoginResponse)
async def login(
    body: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> LoginResponse:
    account_key = f"account:login:{body.email.lower()}"
    ip_key = f"ip:login:{ip}"

    if await is_locked_out(account_key):
        raise AppError(
            "ACCOUNT_LOCKED",
            "Too many failed attempts. Please try again in 15 minutes, or reset your password.",
            429,
        )

    allowed_ip, _ = await check_rate_limit(
        ip_key,
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed_ip:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    allowed_account, _ = await check_rate_limit(
        account_key,
        settings.RATE_LIMIT_AUTH_ACCOUNT_MAX,
        settings.RATE_LIMIT_AUTH_ACCOUNT_WINDOW,
    )
    if not allowed_account:
        await set_lockout(account_key, 900)
        raise AppError(
            "ACCOUNT_LOCKED",
            "Too many failed attempts. Please try again in 15 minutes, or reset your password.",
            429,
        )

    ua = request.headers.get("user-agent", "")

    result = await auth_service.login_with_email(
        db,
        email=body.email,
        password=body.password,
        platform=body.device.platform,
        device_name=body.device.device_name,
        app_version=body.device.app_version,
        os_version=body.device.os_version,
        ip=ip,
        user_agent=ua,
    )
    return LoginResponse(**result)


@router.post("/oauth/google", response_model=LoginResponse)
async def oauth_google(
    body: OAuthGoogleRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> LoginResponse:
    allowed, _ = await check_rate_limit(
        f"ip:oauth:{ip}",
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    user_info = await verify_google_id_token(body.id_token)
    result = await auth_service.handle_oauth_login(
        db,
        user_info=user_info,
        platform=body.device.platform,
        device_name=body.device.device_name,
        app_version=body.device.app_version,
        os_version=body.device.os_version,
        ip=ip,
    )
    return LoginResponse(**result)


@router.post("/oauth/apple", response_model=LoginResponse)
async def oauth_apple(
    body: OAuthAppleRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> LoginResponse:
    allowed, _ = await check_rate_limit(
        f"ip:oauth:{ip}",
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    user_info = await verify_apple_identity_token(body.identity_token)
    result = await auth_service.handle_oauth_login(
        db,
        user_info=user_info,
        platform=body.device.platform,
        device_name=body.device.device_name,
        app_version=body.device.app_version,
        os_version=body.device.os_version,
        ip=ip,
    )
    return LoginResponse(**result)


@router.post("/email/verify", response_model=EmailVerifyResponse)
async def verify_email(
    body: EmailVerifyRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> EmailVerifyResponse:
    allowed, _ = await check_rate_limit(
        f"ip:email_verify:{ip}",
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    result = await auth_service.verify_email(db, body.token)
    return EmailVerifyResponse(**result)


@router.post("/mfa/totp/start", response_model=MfaTotpStartResponse)
async def mfa_totp_start(
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> MfaTotpStartResponse:
    allowed, _ = await check_rate_limit(
        f"ip:mfa_start:{ip}",
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = decode_token(token, expected_type="mfa_enrollment")
    except pyjwt.InvalidTokenError:
        raise AppError("INVALID_TOKEN", "Invalid or expired enrollment token", 401) from None

    user_id = uuid.UUID(payload["sub"])
    device_id = uuid.UUID(payload["did"])

    from app.models.user import User

    user = await db.get(User, user_id)
    if user is None:
        raise AppError("USER_NOT_FOUND", "User not found", 404)

    result = await mfa_service.start_totp_enrollment(db, user_id, device_id, user.email or "")
    return MfaTotpStartResponse(
        secret=result["secret"],
        qr_uri=result["qr_uri"],
        mfa_setup_token=result["mfa_setup_token"],
    )


@router.post("/mfa/totp/confirm", response_model=MfaTotpConfirmResponse)
async def mfa_totp_confirm(
    body: MfaTotpConfirmRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> MfaTotpConfirmResponse:
    allowed, _ = await check_rate_limit(
        f"ip:mfa_confirm:{ip}",
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    try:
        payload = decode_token(body.mfa_setup_token, expected_type="mfa_setup")
    except pyjwt.InvalidTokenError:
        raise AppError("INVALID_TOKEN", "Invalid or expired setup token", 401) from None

    user_id = uuid.UUID(payload["sub"])
    device_id = uuid.UUID(payload["did"])

    codes = await mfa_service.confirm_totp_enrollment(db, user_id, body.totp_code)

    tokens = await auth_service.login_complete_mfa(db, user_id=user_id, device_id=device_id, ip=ip)

    return MfaTotpConfirmResponse(
        recovery_codes=codes,
        access_token=tokens["access_token"],
        refresh_token=tokens["refresh_token"],
    )


@router.post("/mfa/verify", response_model=MfaVerifyResponse)
async def mfa_verify(
    body: MfaVerifyRequest,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> MfaVerifyResponse:
    account_key_prefix = "account:mfa:"

    try:
        payload = decode_token(body.mfa_challenge_token, expected_type="mfa_challenge")
    except pyjwt.InvalidTokenError:
        raise AppError("INVALID_TOKEN", "Invalid or expired MFA challenge token", 401) from None

    user_id = uuid.UUID(payload["sub"])
    device_id = uuid.UUID(payload["did"])

    mfa_key = f"{account_key_prefix}{user_id}"
    if await is_locked_out(mfa_key):
        raise AppError(
            "MFA_LOCKED_OUT",
            "Too many attempts. Please try again in 15 minutes.",
            429,
        )

    allowed, _ = await check_rate_limit(
        mfa_key,
        settings.RATE_LIMIT_AUTH_ACCOUNT_MAX,
        settings.RATE_LIMIT_AUTH_ACCOUNT_WINDOW,
    )
    if not allowed:
        await set_lockout(mfa_key, 900)
        raise AppError(
            "MFA_LOCKED_OUT",
            "Too many attempts. Please try again in 15 minutes.",
            429,
        )

    verified = False
    used_recovery = False
    if body.totp_code:
        verified = await mfa_service.verify_totp_code(db, user_id, body.totp_code)
    elif body.recovery_code:
        verified = await mfa_service.verify_recovery_code(db, user_id, body.recovery_code)
        used_recovery = verified

    if not verified:
        raise AppError(
            "INVALID_MFA_CODE",
            "Invalid verification code. Please try again.",
            401,
        )

    if used_recovery:
        await mfa_service.disable_all_mfa(db, user_id)
        await revoke_all_user_sessions(db, user_id, reason="recovery_code_used", ip=ip)

        partial_token = create_partial_token(
            user_id,
            device_id,
            "mfa_enrollment",
            expires_minutes=settings.MFA_CHALLENGE_EXPIRY_MINUTES,
        )

        await audit_service.log_event(
            db,
            owner_user_id=user_id,
            event_type="mfa.recovery_code_login",
            actor_id=device_id,
            ip=ip,
        )

        from app.models.user import User

        user = await db.get(User, user_id)
        if user and user.email:
            await email_service.send_security_notification(
                user.email,
                "A recovery code was used to sign in. MFA has been reset and you must re-enroll.",
            )

        return MfaVerifyResponse(
            access_token="",
            refresh_token="",
            token_type="bearer",
            requires_mfa_enrollment=True,
            partial_token=partial_token,
        )

    tokens = await auth_service.login_complete_mfa(db, user_id=user_id, device_id=device_id, ip=ip)
    return MfaVerifyResponse(**tokens)


@router.post("/mfa/recovery-codes/reveal", response_model=RecoveryCodesRevealResponse)
async def reveal_recovery_codes(
    request: Request,
    current_user: CurrentUser = Depends(get_current_user),
    step_up: dict = Depends(require_step_up),
    db: AsyncSession = Depends(get_db),
) -> RecoveryCodesRevealResponse:
    codes = await mfa_service.regenerate_recovery_codes(db, current_user.user_id)

    return RecoveryCodesRevealResponse(recovery_codes=codes)


@router.post("/mfa/email-otp/request", response_model=MessageResponse)
async def email_otp_request(
    body: EmailOtpRequestBody,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> MessageResponse:
    allowed, _ = await check_rate_limit(
        f"account:otp:{body.email.lower()}",
        settings.RATE_LIMIT_AUTH_SENSITIVE_MAX,
        settings.RATE_LIMIT_AUTH_SENSITIVE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    from sqlalchemy import select

    from app.models.user import User

    user = (
        await db.execute(select(User).where(User.email == body.email.lower()))
    ).scalar_one_or_none()

    if user is not None:
        from app.core.security import generate_otp

        otp = generate_otp()
        await auth_service.store_email_otp(db, body.email, otp, user.id)
        await email_service.send_otp_email(body.email, otp)

    return MessageResponse(message="If an account exists, a code has been sent.")


@router.post("/mfa/email-otp/verify", response_model=EmailOtpVerifyResponse)
async def email_otp_verify(
    body: EmailOtpVerifyRequest,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> EmailOtpVerifyResponse:
    allowed, _ = await check_rate_limit(
        f"ip:otp_verify:{ip}",
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    user_id = await auth_service.verify_email_otp(db, body.email, body.otp_code)
    if user_id is None:
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    from app.models.user import User

    user = await db.get(User, user_id)
    if user is None:
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    if (
        body.password
        and user.password_hash
        and not verify_password(body.password, user.password_hash)
    ):
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    await mfa_service.disable_all_mfa(db, user_id)
    await revoke_all_user_sessions(db, user_id, reason="mfa_recovery", ip=ip)

    from app.services.device_service import create_or_get_device

    platform = body.device.platform if body.device else "ios"
    device_name = body.device.device_name if body.device else None
    device = await create_or_get_device(
        db, owner_user_id=user_id, platform=platform, device_name=device_name
    )
    partial_token = create_partial_token(
        user_id,
        device.id,
        "mfa_enrollment",
        expires_minutes=settings.MFA_CHALLENGE_EXPIRY_MINUTES,
    )

    if user.email:
        await email_service.send_security_notification(
            user.email, "MFA was reset via email OTP recovery. All sessions have been invalidated."
        )

    return EmailOtpVerifyResponse(partial_token=partial_token)


@router.post("/token/refresh", response_model=TokenRefreshResponse)
async def token_refresh(
    body: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> TokenRefreshResponse:
    allowed, _ = await check_rate_limit(
        f"ip:refresh:{ip}",
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    tokens = await refresh_session(db, refresh_token=body.refresh_token, ip=ip)

    return TokenRefreshResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await revoke_session(db, current_user.session, reason="logout")
    return MessageResponse(message="Logged out successfully")


@router.post("/logout-all", response_model=MessageResponse)
async def logout_all(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> MessageResponse:
    count = await revoke_all_user_sessions(db, current_user.user_id, ip=ip)
    return MessageResponse(message=f"All {count} sessions revoked")


@router.post("/password/reset/request", response_model=MessageResponse)
async def password_reset_request(
    body: PasswordResetRequestBody,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> MessageResponse:
    allowed, _ = await check_rate_limit(
        f"ip:reset:{ip}",
        settings.RATE_LIMIT_AUTH_SENSITIVE_MAX,
        settings.RATE_LIMIT_AUTH_SENSITIVE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    await auth_service.request_password_reset(db, body.email)
    return MessageResponse(message="If an account exists, a reset email has been sent.")


@router.post("/password/reset/confirm", response_model=PasswordResetConfirmResponse)
async def password_reset_confirm(
    body: PasswordResetConfirmRequest,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> PasswordResetConfirmResponse:
    allowed, _ = await check_rate_limit(
        f"ip:reset_confirm:{ip}",
        settings.RATE_LIMIT_AUTH_IP_MAX,
        settings.RATE_LIMIT_AUTH_IP_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    result = await auth_service.confirm_password_reset(
        db, token=body.token, new_password=body.new_password, ip=ip
    )
    return PasswordResetConfirmResponse(**result)


@router.post("/password/change", response_model=PasswordChangeResponse)
async def password_change(
    body: PasswordChangeRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> PasswordChangeResponse:
    allowed, _ = await check_rate_limit(
        f"account:password_change:{current_user.user_id}",
        settings.RATE_LIMIT_AUTH_ACCOUNT_MAX,
        settings.RATE_LIMIT_AUTH_ACCOUNT_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    await auth_service.change_password(
        db,
        user=current_user.user,
        current_password=body.current_password,
        new_password=body.new_password,
        ip=ip,
    )
    return PasswordChangeResponse(status="password_changed")


# ── PIN login ────────────────────────────────────────────────────────


@router.post("/pin/setup", response_model=PinSetupResponse)
async def pin_setup(
    body: PinSetupRequest,
    current_user: CurrentUser = Depends(get_current_user),
    step_up: dict = Depends(require_step_up),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> PinSetupResponse:
    from app.models.device import Device

    device = await db.get(Device, current_user.device_id)
    if device is None:
        raise AppError("DEVICE_NOT_FOUND", "Device not found", 404)

    await pin_service.setup_pin(
        db,
        user=current_user.user,
        device=device,
        pin=body.pin,
        ip=ip,
    )
    return PinSetupResponse(status="pin_enabled")


@router.post("/pin/login", response_model=LoginResponse)
async def pin_login(
    body: PinLoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> LoginResponse:
    allowed, _ = await check_rate_limit(
        f"ip:pin_login:{ip}",
        settings.RATE_LIMIT_AUTH_SENSITIVE_MAX,
        settings.RATE_LIMIT_AUTH_SENSITIVE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    try:
        device_id = uuid.UUID(body.device_id)
    except ValueError:
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401) from None

    ua = request.headers.get("user-agent", "")
    result = await pin_service.verify_pin_and_login(
        db,
        device_id=device_id,
        pin=body.pin,
        ip=ip,
        user_agent=ua,
    )
    return LoginResponse(**result)


@router.delete("/pin", response_model=PinSetupResponse)
async def pin_disable(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> PinSetupResponse:
    from app.models.device import Device

    device = await db.get(Device, current_user.device_id)
    if device is None:
        raise AppError("DEVICE_NOT_FOUND", "Device not found", 404)

    await pin_service.disable_pin(
        db,
        user=current_user.user,
        device=device,
        ip=ip,
    )
    return PinSetupResponse(status="pin_disabled")


@router.get("/pin/status", response_model=PinStatusResponse)
async def pin_status(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PinStatusResponse:
    from app.models.device import Device

    device = await db.get(Device, current_user.device_id)
    enabled = device is not None and device.pin_hash is not None
    return PinStatusResponse(pin_enabled=enabled)


@router.post("/step-up", response_model=StepUpResponse)
async def step_up_auth(
    body: StepUpRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> StepUpResponse:
    allowed, _ = await check_rate_limit(
        f"account:step_up:{current_user.user_id}",
        settings.RATE_LIMIT_AUTH_ACCOUNT_MAX,
        settings.RATE_LIMIT_AUTH_ACCOUNT_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    verified = False

    if (
        body.password
        and current_user.user.password_hash
        and verify_password(body.password, current_user.user.password_hash)
    ):
        verified = True

    if body.totp_code and not verified:
        verified = await mfa_service.verify_totp_code(db, current_user.user_id, body.totp_code)

    if not verified:
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    token = create_partial_token(
        current_user.user_id,
        current_user.device_id,
        "step_up",
        expires_minutes=settings.STEP_UP_TOKEN_EXPIRY_MINUTES,
    )
    return StepUpResponse(step_up_token=token)


def _build_redirect_html(deep_link: str, heading: str, body_text: str) -> str:
    safe_link = deep_link.replace("&", "&amp;").replace('"', "&quot;")
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>MattBot - {heading}</title>
<style>
  *{{margin:0;padding:0;box-sizing:border-box}}
  body{{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
       background:#f5f5fa;color:#1a1a2e;display:flex;align-items:center;
       justify-content:center;min-height:100vh;padding:24px}}
  .card{{background:#fff;border-radius:16px;padding:48px 32px;max-width:400px;
        width:100%;text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08)}}
  h1{{font-size:22px;margin-bottom:8px}}
  p{{color:#666;font-size:15px;line-height:1.5;margin-bottom:24px}}
  .btn{{display:inline-block;background:#4263eb;color:#fff;text-decoration:none;
       padding:14px 32px;border-radius:12px;font-size:16px;font-weight:600;
       transition:background .2s}}
  .btn:hover{{background:#3b5bdb}}
  .sub{{color:#999;font-size:13px;margin-top:16px}}
</style>
</head>
<body>
<div class="card">
  <h1>{heading}</h1>
  <p>{body_text}</p>
  <a class="btn" href="{safe_link}">Open MattBot</a>
  <p class="sub">If the app didn't open automatically, tap the button above.</p>
</div>
<script>window.location.replace("{safe_link}");</script>
</body>
</html>"""


@router.get("/link/verify-email", response_class=HTMLResponse)
async def link_verify_email(token: str = Query(..., min_length=1)) -> HTMLResponse:
    safe_token = quote(token, safe="")
    deep_link = f"mattbot://verify-email?token={safe_token}"
    html = _build_redirect_html(
        deep_link,
        heading="Email Verification",
        body_text="Opening MattBot to verify your email...",
    )
    return HTMLResponse(content=html)


@router.get("/link/reset-password", response_class=HTMLResponse)
async def link_reset_password(token: str = Query(..., min_length=1)) -> HTMLResponse:
    safe_token = quote(token, safe="")
    deep_link = f"mattbot://reset-password?token={safe_token}"
    html = _build_redirect_html(
        deep_link,
        heading="Reset Password",
        body_text="Opening MattBot to reset your password...",
    )
    return HTMLResponse(content=html)

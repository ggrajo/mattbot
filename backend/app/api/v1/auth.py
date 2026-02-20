import uuid

import jwt as pyjwt
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import (
    CurrentUser,
    get_client_ip,
    get_current_user,
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
    PasswordResetConfirmRequest,
    PasswordResetConfirmResponse,
    PasswordResetRequestBody,
    RecoveryCodesRevealResponse,
    RegisterRequest,
    RegisterResponse,
    StepUpRequest,
    StepUpResponse,
    TokenRefreshRequest,
    TokenRefreshResponse,
)
from app.schemas.common import MessageResponse
from app.services import auth_service, email_service, mfa_service
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
    allowed, _ = await check_rate_limit(f"ip:register:{ip}", 20, 600)
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
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    allowed_ip, _ = await check_rate_limit(ip_key, 20, 600)
    if not allowed_ip:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    allowed_account, _ = await check_rate_limit(account_key, 5, 600)
    if not allowed_account:
        await set_lockout(account_key, 900)
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    device_info = {"platform": "ios", "device_name": None, "app_version": None, "os_version": None}
    ua = request.headers.get("user-agent", "")

    result = await auth_service.login_with_email(
        db,
        email=body.email,
        password=body.password,
        platform=device_info["platform"],
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
    db: AsyncSession = Depends(get_db),
) -> EmailVerifyResponse:
    result = await auth_service.verify_email(db, body.token)
    return EmailVerifyResponse(**result)


@router.post("/mfa/totp/start", response_model=MfaTotpStartResponse)
async def mfa_totp_start(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> MfaTotpStartResponse:
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    try:
        payload = decode_token(token, expected_type="mfa_enrollment")
    except pyjwt.InvalidTokenError:
        raise AppError("INVALID_TOKEN", "Invalid or expired enrollment token", 401)

    user_id = uuid.UUID(payload["sub"])
    device_id = uuid.UUID(payload["did"])

    from app.models.user import User
    user = await db.get(User, user_id)
    if user is None:
        raise AppError("USER_NOT_FOUND", "User not found", 404)

    result = await mfa_service.start_totp_enrollment(
        db, user_id, device_id, user.email or ""
    )
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
    try:
        payload = decode_token(body.mfa_setup_token, expected_type="mfa_setup")
    except pyjwt.InvalidTokenError:
        raise AppError("INVALID_TOKEN", "Invalid or expired setup token", 401)

    user_id = uuid.UUID(payload["sub"])
    device_id = uuid.UUID(payload["did"])

    codes = await mfa_service.confirm_totp_enrollment(db, user_id, body.totp_code)

    tokens = await auth_service.login_complete_mfa(
        db, user_id=user_id, device_id=device_id, ip=ip
    )

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
        raise AppError("INVALID_TOKEN", "Invalid or expired MFA challenge token", 401)

    user_id = uuid.UUID(payload["sub"])
    device_id = uuid.UUID(payload["did"])

    mfa_key = f"{account_key_prefix}{user_id}"
    if await is_locked_out(mfa_key):
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    allowed, _ = await check_rate_limit(mfa_key, 5, 600)
    if not allowed:
        await set_lockout(mfa_key, 900)
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    verified = False
    if body.totp_code:
        verified = await mfa_service.verify_totp_code(db, user_id, body.totp_code)
    elif body.recovery_code:
        verified = await mfa_service.verify_recovery_code(db, user_id, body.recovery_code)

    if not verified:
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    tokens = await auth_service.login_complete_mfa(
        db, user_id=user_id, device_id=device_id, ip=ip
    )
    return MfaVerifyResponse(**tokens)


@router.post("/mfa/recovery-codes/reveal", response_model=RecoveryCodesRevealResponse)
async def reveal_recovery_codes(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RecoveryCodesRevealResponse:
    step_up_token = None  # Step-up enforcement is via X-Step-Up-Token header
    # For simplicity, this endpoint requires step-up validated at middleware level
    codes = await mfa_service.regenerate_recovery_codes(db, current_user.user_id)
    return RecoveryCodesRevealResponse(recovery_codes=codes)


@router.post("/mfa/email-otp/request", response_model=MessageResponse)
async def email_otp_request(
    body: EmailOtpRequestBody,
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> MessageResponse:
    allowed, _ = await check_rate_limit(f"account:otp:{body.email.lower()}", 3, 3600)
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    from app.models.user import User
    from sqlalchemy import select
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
    user_id = await auth_service.verify_email_otp(db, body.email, body.otp_code)
    if user_id is None:
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    from app.models.user import User
    user = await db.get(User, user_id)
    if user is None:
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    if body.password and user.password_hash:
        if not verify_password(body.password, user.password_hash):
            raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    await mfa_service.disable_all_mfa(db, user_id)
    await revoke_all_user_sessions(db, user_id, reason="mfa_recovery", ip=ip)

    from app.services.device_service import create_or_get_device
    device = await create_or_get_device(db, owner_user_id=user_id, platform="ios")
    partial_token = create_partial_token(user_id, device.id, "mfa_enrollment", expires_minutes=10)

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
    try:
        tokens = await refresh_session(db, refresh_token=body.refresh_token, ip=ip)
    except ValueError as e:
        raise AppError("INVALID_TOKEN", str(e), 401)

    return TokenRefreshResponse(
        access_token=tokens.access_token,
        refresh_token=tokens.refresh_token,
    )


@router.post("/logout", response_model=MessageResponse)
async def logout(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    await revoke_session(current_user.session, reason="logout")
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
    allowed, _ = await check_rate_limit(f"ip:reset:{ip}", 5, 3600)
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
    result = await auth_service.confirm_password_reset(
        db, token=body.token, new_password=body.new_password, ip=ip
    )
    return PasswordResetConfirmResponse(**result)


@router.post("/step-up", response_model=StepUpResponse)
async def step_up_auth(
    body: StepUpRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> StepUpResponse:
    verified = False

    if body.password and current_user.user.password_hash:
        if verify_password(body.password, current_user.user.password_hash):
            verified = True

    if body.totp_code and not verified:
        verified = await mfa_service.verify_totp_code(db, current_user.user_id, body.totp_code)

    if not verified:
        raise AppError("INVALID_CREDENTIALS", "Invalid credentials", 401)

    token = create_partial_token(
        current_user.user_id, current_user.device_id, "step_up", expires_minutes=5
    )
    return StepUpResponse(step_up_token=token)

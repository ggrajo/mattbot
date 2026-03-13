from pydantic import BaseModel, EmailStr, Field


class DeviceInfo(BaseModel):
    platform: str = Field(..., pattern="^(ios|android|web)$")
    device_name: str | None = None
    app_version: str | None = None
    os_version: str | None = None


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=12, max_length=128)
    device: DeviceInfo


class RegisterResponse(BaseModel):
    user_id: str
    status: str
    message: str = "Verification email sent"


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    device: DeviceInfo


class LoginResponse(BaseModel):
    requires_mfa: bool = False
    requires_mfa_enrollment: bool = False
    mfa_challenge_token: str | None = None
    partial_token: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    token_type: str | None = None


class OAuthGoogleRequest(BaseModel):
    id_token: str
    device: DeviceInfo


class OAuthAppleRequest(BaseModel):
    identity_token: str
    authorization_code: str | None = None
    device: DeviceInfo


class EmailVerifyRequest(BaseModel):
    token: str


class EmailVerifyResponse(BaseModel):
    status: str


class MfaTotpStartResponse(BaseModel):
    secret: str
    qr_uri: str
    mfa_setup_token: str


class MfaTotpConfirmRequest(BaseModel):
    mfa_setup_token: str
    totp_code: str = Field(..., min_length=6, max_length=6)


class MfaTotpConfirmResponse(BaseModel):
    recovery_codes: list[str]
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class MfaVerifyRequest(BaseModel):
    mfa_challenge_token: str
    totp_code: str | None = None
    recovery_code: str | None = None


class MfaVerifyResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    requires_mfa_enrollment: bool = False
    partial_token: str | None = None


class RecoveryCodesRevealResponse(BaseModel):
    recovery_codes: list[str]


class EmailOtpRequestBody(BaseModel):
    email: EmailStr


class EmailOtpVerifyRequest(BaseModel):
    email: EmailStr
    otp_code: str = Field(..., min_length=6, max_length=6)
    password: str | None = None
    device: DeviceInfo | None = None


class EmailOtpVerifyResponse(BaseModel):
    requires_totp_reenrollment: bool = True
    partial_token: str


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class TokenRefreshResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class PasswordResetRequestBody(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=12, max_length=128)


class PasswordResetConfirmResponse(BaseModel):
    requires_mfa: bool = False
    mfa_challenge_token: str | None = None
    status: str | None = None


class PinSetupRequest(BaseModel):
    pin: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class PinSetupResponse(BaseModel):
    status: str


class PinLoginRequest(BaseModel):
    device_id: str
    pin: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")


class PinStatusResponse(BaseModel):
    pin_enabled: bool
    pin_set_at: str | None = None
    pin_expired: bool = False
    days_until_expiry: int | None = None
    expires_at: str | None = None


class PasswordChangeRequest(BaseModel):
    current_password: str | None = None
    new_password: str = Field(..., min_length=12, max_length=128)


class PasswordChangeResponse(BaseModel):
    status: str


class StepUpRequest(BaseModel):
    password: str | None = None
    totp_code: str | None = None


class StepUpResponse(BaseModel):
    step_up_token: str

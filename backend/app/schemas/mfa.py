from pydantic import BaseModel


class MfaStatusResponse(BaseModel):
    totp_enabled: bool
    recovery_codes_remaining: int

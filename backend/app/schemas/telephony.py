from datetime import datetime

from pydantic import BaseModel, Field


class ProvisionNumberResponse(BaseModel):
    e164: str
    status: str
    provisioned_at: datetime | None = None


class UserNumberResponse(BaseModel):
    e164: str
    status: str
    provisioned_at: datetime | None = None
    twilio_number_sid: str | None = None


class CallModeUpdateRequest(BaseModel):
    mode: str = Field(..., pattern="^(mode_a|mode_b)$")
    forwarding_number: str | None = None


class CallModeResponse(BaseModel):
    mode: str
    forwarding_number: str | None = None
    forwarding_verified: bool = False


class ForwardingSetupGuideResponse(BaseModel):
    steps: list[str]
    ai_number: str | None = None


class StartVerificationResponse(BaseModel):
    attempt_id: str
    verification_code: str
    instructions: str


class VerificationStatusResponse(BaseModel):
    status: str
    verified_at: datetime | None = None

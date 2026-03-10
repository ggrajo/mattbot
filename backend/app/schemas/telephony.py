from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, field_validator


class NumberProvisionResponse(BaseModel):
    id: str
    e164: str
    status: str
    provisioned_at: datetime | None = None

    model_config = {"from_attributes": True}


class NumberListResponse(BaseModel):
    items: list[NumberProvisionResponse] = []


class CallModesResponse(BaseModel):
    mode_a_enabled: bool = True
    mode_b_enabled: bool = False
    access_control: str = "everyone"
    verification_status: str = "unverified"

    model_config = {"from_attributes": True}


class CallModesPatchRequest(BaseModel):
    mode_a_enabled: bool | None = None
    mode_b_enabled: bool | None = None
    access_control: str | None = None
    personal_number_e164: str | None = None

    @field_validator("access_control")
    @classmethod
    def validate_access(cls, v: str | None) -> str | None:
        if v is not None and v not in ("everyone", "contacts", "vip"):
            raise ValueError("Must be one of: everyone, contacts, vip")
        return v


class CarrierGuide(BaseModel):
    carrier: str
    enable_busy: str
    enable_unreachable: str
    disable: str


class ForwardingSetupGuideResponse(BaseModel):
    generic_instructions: list[str]
    carrier_guides: list[CarrierGuide]


class ForwardingVerifyResponse(BaseModel):
    attempt_id: str
    status: str
    message: str


class ForwardingVerifyStatusResponse(BaseModel):
    verification_status: str
    last_verified_at: datetime | None = None
    latest_attempt_status: str | None = None

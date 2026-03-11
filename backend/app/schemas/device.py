from datetime import datetime

from pydantic import BaseModel, Field


class DeviceResponse(BaseModel):
    id: str
    platform: str
    device_name: str | None
    app_version: str | None
    os_version: str | None
    last_ip: str | None = None
    last_location: str | None = None
    is_remembered: bool = False
    last_seen_at: datetime | None
    created_at: datetime
    is_current: bool = False

    model_config = {"from_attributes": True}


class DeviceListResponse(BaseModel):
    items: list[DeviceResponse]


class DeviceRegisterRequest(BaseModel):
    device_id: str | None = None
    platform: str = Field(..., pattern="^(ios|android|web)$")
    device_name: str | None = None
    app_version: str | None = None
    os_version: str | None = None


class DeviceRememberRequest(BaseModel):
    is_remembered: bool

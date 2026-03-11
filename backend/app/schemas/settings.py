from pydantic import BaseModel, Field


class QuietHoursSettings(BaseModel):
    quiet_hours_enabled: bool = False
    quiet_hours_start: str | None = Field(
        None, description="Start time in HH:MM (24h) format"
    )
    quiet_hours_end: str | None = Field(
        None, description="End time in HH:MM (24h) format"
    )


class SettingsResponse(BaseModel):
    quiet_hours_enabled: bool = False
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None

    model_config = {"from_attributes": True}


class SettingsUpdateRequest(BaseModel):
    quiet_hours_enabled: bool | None = None
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None

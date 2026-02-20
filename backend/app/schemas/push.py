from pydantic import BaseModel, Field


class PushRegisterRequest(BaseModel):
    device_id: str
    provider: str = Field(default="fcm", pattern="^fcm$")
    token: str


class PushRegisterResponse(BaseModel):
    push_token_id: str

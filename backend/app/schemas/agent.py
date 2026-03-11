import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class AgentResponse(BaseModel):
    id: uuid.UUID
    name: str
    system_prompt: str | None = None
    greeting_message: str | None = None
    voice_id: str | None = None
    language: str
    personality: str
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentCreateRequest(BaseModel):
    name: str = Field("MattBot", max_length=100)
    system_prompt: str | None = None
    greeting_message: str | None = Field(None, max_length=500)
    voice_id: str | None = Field(None, max_length=100)
    language: str = Field("en", max_length=10)
    personality: str = Field("professional", max_length=30)


class AgentUpdateRequest(BaseModel):
    name: str | None = Field(None, max_length=100)
    system_prompt: str | None = None
    greeting_message: str | None = Field(None, max_length=500)
    voice_id: str | None = Field(None, max_length=100)
    language: str | None = Field(None, max_length=10)
    personality: str | None = Field(None, max_length=30)

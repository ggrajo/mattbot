import uuid
from datetime import datetime

from pydantic import BaseModel


class CallResponse(BaseModel):
    id: uuid.UUID
    from_number: str
    to_number: str
    direction: str
    status: str
    duration_seconds: int | None = None
    started_at: datetime
    answered_at: datetime | None = None
    ended_at: datetime | None = None
    caller_phone_hash: str | None = None
    caller_name: str | None = None
    memory_count: int = 0

    model_config = {"from_attributes": True}


class CallListResponse(BaseModel):
    calls: list[CallResponse]
    total: int


class CallEventResponse(BaseModel):
    id: uuid.UUID
    event_type: str
    from_status: str | None = None
    to_status: str
    created_at: datetime

    model_config = {"from_attributes": True}

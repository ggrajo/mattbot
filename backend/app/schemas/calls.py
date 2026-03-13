"""Pydantic schemas for call log and artifact endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, field_validator


class CallEventResponse(BaseModel):
    id: str
    event_type: str
    provider_status: str | None = None
    event_at: datetime

    model_config = {"from_attributes": True}


class CallListItem(BaseModel):
    id: str
    created_at: datetime
    direction: str
    from_masked: str
    to_masked: str
    status: str
    duration_seconds: int | None = None
    source_type: str
    missing_summary: bool
    missing_transcript: bool
    missing_labels: bool
    started_at: datetime
    artifact_status: str | None = None
    agent_id: str | None = None
    voice_id: str | None = None
    booked_calendar_event_id: str | None = None
    booked_calendar_event_summary: str | None = None
    caller_display_name: str | None = None
    caller_relationship: str | None = None
    is_vip: bool = False
    is_blocked: bool = False
    has_notes: bool = False
    has_reminder: bool = False
    labels: list[str] = []

    model_config = {"from_attributes": True}


class CallListResponse(BaseModel):
    items: list[CallListItem]
    next_cursor: str | None = None
    has_more: bool = False


class CallDetailResponse(BaseModel):
    id: str
    direction: str
    source_type: str
    from_masked: str
    to_masked: str
    status: str
    started_at: datetime
    ended_at: datetime | None = None
    duration_seconds: int | None = None
    forwarding_detected: bool
    missing_summary: bool
    missing_transcript: bool
    missing_labels: bool
    events: list[CallEventResponse] = []
    created_at: datetime
    summary: str | None = None
    summary_status: str | None = None
    labels: list[LabelResponse] | None = None
    labels_status: str | None = None
    transcript_status: str | None = None
    notes: str | None = None
    recording_available: bool = False
    is_vip: bool = False
    is_blocked: bool = False
    caller_display_name: str | None = None
    caller_relationship: str | None = None
    agent_id: str | None = None
    voice_id: str | None = None
    booked_calendar_event_id: str | None = None
    booked_calendar_event_summary: str | None = None
    booked_appointment_date: str | None = None
    booked_appointment_time: str | None = None
    booked_appointment_duration_minutes: int | None = None
    booked_appointment_caller_name: str | None = None
    booked_appointment_reason: str | None = None

    model_config = {"from_attributes": True}


class MarkBlockedRequest(BaseModel):
    reason: str | None = None


class MarkStatusResponse(BaseModel):
    is_vip: bool = False
    is_blocked: bool = False


class LabelResponse(BaseModel):
    label_name: str
    reason_text: str
    evidence_snippets: list[str] = []
    confidence: float = 0.0
    spam_score: float | None = None
    produced_by: str = "deterministic"


class ArtifactResponse(BaseModel):
    call_id: str
    summary: str | None = None
    summary_status: str
    labels: list[LabelResponse] = []
    labels_status: str
    transcript_status: str
    structured_extraction: dict | None = None


class TranscriptTurn(BaseModel):
    role: str
    text: str
    time_seconds: float = 0.0


class TranscriptResponse(BaseModel):
    call_id: str
    conversation_id: str | None = None
    turns: list[TranscriptTurn] = []
    turn_count: int = 0
    status: str = "ready"


_URGENCY_VALUES = {"low", "normal", "urgent"}
_SPAM_LABEL_VALUES = {"normal_call", "possible_spam", "sales", "unknown"}


class CallPatchRequest(BaseModel):
    urgency_level: str | None = None
    spam_label: str | None = None
    is_vip_override: bool | None = None
    notes: str | None = None

    @field_validator("urgency_level")
    @classmethod
    def validate_urgency(cls, v: str | None) -> str | None:
        if v is not None and v not in _URGENCY_VALUES:
            raise ValueError(f"urgency_level must be one of {sorted(_URGENCY_VALUES)}")
        return v

    @field_validator("spam_label")
    @classmethod
    def validate_spam_label(cls, v: str | None) -> str | None:
        if v is not None and v not in _SPAM_LABEL_VALUES:
            raise ValueError(f"spam_label must be one of {sorted(_SPAM_LABEL_VALUES)}")
        return v

    @field_validator("notes")
    @classmethod
    def validate_notes_length(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 5000:
            raise ValueError("notes must be at most 5000 characters")
        return v


class SummaryRegenerateResponse(BaseModel):
    call_id: str
    summary_status: str
    message: str


class RecordingResponse(BaseModel):
    call_id: str
    recording_available: bool = False
    recording_url: str | None = None
    duration_seconds: int | None = None


class MemoryItemResponse(BaseModel):
    id: str
    memory_type: str
    subject: str | None = None
    value: str | None = None
    confidence: float | None = None
    user_confirmed: bool = False
    source_call_id: str | None = None
    caller_phone_hash: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class MemoryListResponse(BaseModel):
    items: list[MemoryItemResponse]


_ALLOWED_MEMORY_TYPES = {
    "callback_window_preference",
    "caller_display_name",
    "communication_preference",
    "relationship_tag",
    "repeated_reason_pattern",
}


class CreateMemoryItemRequest(BaseModel):
    memory_type: str
    subject: str
    value: str
    caller_phone_hash: str | None = None

    @field_validator("memory_type")
    @classmethod
    def validate_memory_type(cls, v: str) -> str:
        if v not in _ALLOWED_MEMORY_TYPES:
            raise ValueError(f"memory_type must be one of {sorted(_ALLOWED_MEMORY_TYPES)}")
        return v

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: str) -> str:
        if len(v) > 100:
            raise ValueError("subject must be at most 100 characters")
        return v

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: str) -> str:
        if len(v) > 2000:
            raise ValueError("value must be at most 2000 characters")
        return v


class UpdateMemoryItemRequest(BaseModel):
    subject: str | None = None
    value: str | None = None
    user_confirmed: bool | None = None

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 100:
            raise ValueError("subject must be at most 100 characters")
        return v

    @field_validator("value")
    @classmethod
    def validate_value(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 2000:
            raise ValueError("value must be at most 2000 characters")
        return v

"""Pydantic schemas for agent endpoints."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class VoiceSelection(BaseModel):
    voice_id: str | None = None
    display_name: str | None = None
    provider_voice_id: str | None = None


class AgentResponse(BaseModel):
    id: str
    display_name: str
    function_type: str
    is_default: bool
    status: str
    voice: VoiceSelection | None = None
    user_instructions: str | None = None
    greeting_instructions: str | None = None
    revision: int = 1
    created_at: datetime

    model_config = {"from_attributes": True}


class AgentListResponse(BaseModel):
    items: list[AgentResponse]


class CreateDefaultAgentRequest(BaseModel):
    display_name: str | None = Field(None, max_length=60)
    voice_id: str | None = None
    user_instructions: str | None = Field(None, max_length=2000)


class UpdateAgentRequest(BaseModel):
    display_name: str | None = Field(None, max_length=60)
    voice_id: str | None = None
    user_instructions: str | None = Field(None, max_length=2000)
    greeting_instructions: str | None = Field(None, max_length=500)
    expected_revision: int | None = None


class VoiceCatalogItem(BaseModel):
    id: str
    provider_voice_id: str
    display_name: str
    locale: str
    gender_tag: str | None = None
    preview_url: str | None = None
    sort_order: int = 0

    model_config = {"from_attributes": True}


class VoiceCatalogResponse(BaseModel):
    items: list[VoiceCatalogItem]


class PromptSuggestionItem(BaseModel):
    id: str
    title: str
    text: str
    sort_order: int = 0

    model_config = {"from_attributes": True}


class PromptSuggestionsResponse(BaseModel):
    items: list[PromptSuggestionItem]


class AgentRuntimeResponse(BaseModel):
    """Internal-only response for Node bridge. Never exposed to mobile."""

    agent_id: str
    agent_display_name: str
    agent_function_type: str
    provider_voice_id: str
    final_prompt: str
    greeting_text: str = ""
    elevenlabs_agent_id: str = ""
    call_objective_mode: str = "screen_and_summarize"
    max_call_length_seconds: int = 180
    recording_enabled: bool = False
    memory_enabled: bool = True

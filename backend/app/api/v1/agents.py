"""Agent management endpoints."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.models.agent import Agent

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.agents import (
    AgentListResponse,
    AgentResponse,
    CreateDefaultAgentRequest,
    UpdateAgentRequest,
    VoiceSelection,
)
from app.services import agent_service

router = APIRouter()


def _agent_to_response(agent: Agent) -> AgentResponse:
    """Map Agent ORM object to AgentResponse, never exposing system prompt."""
    config = agent.config
    voice = None
    if config and config.voice_id:
        voice = VoiceSelection(voice_id=str(config.voice_id))

    return AgentResponse(
        id=str(agent.id),
        display_name=agent.display_name,
        function_type=agent.function_type,
        is_default=agent.is_default,
        status=agent.status,
        voice=voice,
        user_instructions=config.user_instructions if config else None,
        greeting_instructions=config.greeting_instructions if config else None,
        revision=config.revision if config else 1,
        created_at=agent.created_at,
    )


@router.get("", response_model=AgentListResponse)
async def list_agents(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentListResponse:
    agents = await agent_service.get_agents_for_user(db, current_user.user_id)
    return AgentListResponse(items=[_agent_to_response(a) for a in agents])


@router.post("/default", response_model=AgentResponse)
async def create_default_agent(
    body: CreateDefaultAgentRequest | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    allowed, _ = await check_rate_limit(
        f"agents:create:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests", 429)

    voice_id = None
    if body and body.voice_id:
        try:
            voice_id = uuid.UUID(body.voice_id)
        except ValueError as err:
            raise AppError("INVALID_VOICE_ID", "Invalid voice_id format", 400) from err

    agent = await agent_service.get_or_create_default_agent(
        db,
        user_id=current_user.user_id,
        display_name=body.display_name if body else None,
        voice_id=voice_id,
        user_instructions=body.user_instructions if body else None,
    )
    await db.commit()
    return _agent_to_response(agent)


@router.post("/default/sync", response_model=AgentResponse)
async def sync_default_agent(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    """Create or update the ElevenLabs agent for the user's default agent."""
    allowed, _ = await check_rate_limit(
        f"agents:sync:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests", 429)

    agent = await agent_service.get_or_create_default_agent(
        db,
        user_id=current_user.user_id,
    )

    el_id = await agent_service.ensure_elevenlabs_agent(db, agent, current_user.user_id)
    if not el_id:
        raise AppError(
            "ELEVENLABS_SYNC_FAILED",
            "Failed to provision or update ElevenLabs agent",
            502,
        )

    await db.commit()
    return _agent_to_response(agent)


@router.patch("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: str,
    body: UpdateAgentRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    allowed, _ = await check_rate_limit(
        f"agents:update:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests", 429)

    try:
        aid = uuid.UUID(agent_id)
    except ValueError as err:
        raise AppError("INVALID_AGENT_ID", "Invalid agent_id format", 400) from err

    agent = await agent_service.update_agent(
        db,
        user_id=current_user.user_id,
        agent_id=aid,
        display_name=body.display_name,
        voice_id=body.voice_id,
        user_instructions=body.user_instructions,
        greeting_instructions=body.greeting_instructions,
        expected_revision=body.expected_revision,
    )

    try:
        await agent_service.ensure_elevenlabs_agent(db, agent, current_user.user_id)
    except Exception:
        import logging

        logging.getLogger(__name__).exception("Failed to sync ElevenLabs agent after agent update")

    await db.commit()
    return _agent_to_response(agent)

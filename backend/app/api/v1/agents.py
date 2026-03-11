"""Agent configuration API."""

import logging
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.services.agent_service import agent_service

logger = logging.getLogger(__name__)

router = APIRouter()


class AgentCreate(BaseModel):
    name: str = "MattBot"
    system_prompt: str | None = None
    greeting_message: str | None = None
    voice_id: str | None = None
    language: str = "en"
    personality: str = "professional"


class AgentUpdate(BaseModel):
    name: str | None = None
    system_prompt: str | None = None
    greeting_message: str | None = None
    voice_id: str | None = None
    language: str | None = None
    personality: str | None = None


class AgentResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    name: str
    system_prompt: str | None = None
    greeting_message: str | None = None
    voice_id: str | None = None
    language: str = "en"
    personality: str = "professional"
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class AgentListResponse(BaseModel):
    agents: list[AgentResponse]
    total: int


class SyncResponse(BaseModel):
    agent_id: uuid.UUID
    status: str
    prompt_length: int | None = None


@router.get("", response_model=AgentListResponse)
async def list_agents(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentListResponse:
    try:
        from app.models.agent import Agent

        result = await db.execute(
            select(Agent)
            .where(
                Agent.user_id == current_user.user_id,
                Agent.is_active.is_(True),
            )
            .order_by(Agent.created_at.desc())
        )
        agents = list(result.scalars().all())

        if not agents:
            default = await agent_service.get_or_create_default_agent(
                db, current_user.user_id
            )
            agents = [default]

        return AgentListResponse(
            agents=[AgentResponse.model_validate(a) for a in agents],
            total=len(agents),
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to list agents for user %s", current_user.user_id)
        raise AppError("AGENT_ERROR", f"Failed to list agents: {e}", 500)


@router.get("/{agent_id}", response_model=AgentResponse)
async def get_agent(
    agent_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    try:
        from app.models.agent import Agent

        result = await db.execute(
            select(Agent).where(
                Agent.id == agent_id,
                Agent.user_id == current_user.user_id,
            )
        )
        agent = result.scalars().first()
        if agent is None:
            raise AppError("AGENT_NOT_FOUND", "Agent not found", 404)
        return AgentResponse.model_validate(agent)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to get agent %s", agent_id)
        raise AppError("AGENT_ERROR", f"Failed to get agent: {e}", 500)


@router.post("", response_model=AgentResponse, status_code=201)
async def create_agent(
    body: AgentCreate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    try:
        from app.models.agent import Agent

        agent = Agent(
            user_id=current_user.user_id,
            name=body.name,
            system_prompt=body.system_prompt,
            greeting_message=body.greeting_message,
            voice_id=body.voice_id,
            language=body.language,
            personality=body.personality,
        )
        db.add(agent)
        await db.flush()

        return AgentResponse.model_validate(agent)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to create agent for user %s", current_user.user_id)
        raise AppError("AGENT_ERROR", f"Failed to create agent: {e}", 500)


@router.put("/{agent_id}", response_model=AgentResponse)
async def update_agent(
    agent_id: uuid.UUID,
    body: AgentUpdate,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    try:
        from app.models.agent import Agent

        result = await db.execute(
            select(Agent).where(
                Agent.id == agent_id,
                Agent.user_id == current_user.user_id,
            )
        )
        agent = result.scalars().first()
        if agent is None:
            raise AppError("AGENT_NOT_FOUND", "Agent not found", 404)

        update_data = body.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(agent, field, value)

        await db.flush()
        return AgentResponse.model_validate(agent)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to update agent %s", agent_id)
        raise AppError("AGENT_ERROR", f"Failed to update agent: {e}", 500)


@router.post("/{agent_id}/default", response_model=AgentResponse)
async def set_default_agent(
    agent_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AgentResponse:
    try:
        from app.models.agent import Agent

        result = await db.execute(
            select(Agent).where(
                Agent.id == agent_id,
                Agent.user_id == current_user.user_id,
            )
        )
        agent = result.scalars().first()
        if agent is None:
            raise AppError("AGENT_NOT_FOUND", "Agent not found", 404)

        await db.execute(
            update(Agent)
            .where(Agent.user_id == current_user.user_id)
            .values(is_active=False)
        )
        agent.is_active = True
        await db.flush()

        return AgentResponse.model_validate(agent)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to set default agent %s", agent_id)
        raise AppError("AGENT_ERROR", f"Failed to set default agent: {e}", 500)


@router.post("/{agent_id}/sync", response_model=SyncResponse)
async def sync_agent(
    agent_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SyncResponse:
    """Manually trigger a sync of this agent's prompt with ElevenLabs."""
    try:
        from app.models.agent import Agent
        from app.models.user import User

        result = await db.execute(
            select(Agent).where(
                Agent.id == agent_id,
                Agent.user_id == current_user.user_id,
            )
        )
        agent = result.scalars().first()
        if agent is None:
            raise AppError("AGENT_NOT_FOUND", "Agent not found", 404)

        user_result = await db.execute(
            select(User).where(User.id == current_user.user_id)
        )
        user = user_result.scalar_one_or_none()

        prompt = await agent_service.build_system_prompt(db, agent, user, None)

        from app.services.elevenlabs_agent_service import ElevenLabsAgentService

        await ElevenLabsAgentService.create_conversation(
            agent_id=agent.voice_id or "",
            system_prompt=prompt,
            voice_id=agent.voice_id,
        )

        logger.info(
            "Agent %s synced for user %s (prompt length: %d)",
            agent_id,
            current_user.user_id,
            len(prompt),
        )

        return SyncResponse(
            agent_id=agent.id,
            status="synced",
            prompt_length=len(prompt),
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to sync agent %s", agent_id)
        raise AppError("AGENT_ERROR", f"Failed to sync agent: {e}", 500)

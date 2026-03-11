"""Service for managing AI agents and building system prompts."""

import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.agent import Agent
from app.models.agent_config import AgentConfig
from app.models.user import User


class AgentService:

    @staticmethod
    async def get_or_create_default_agent(
        db: AsyncSession, user_id: uuid.UUID
    ) -> Agent:
        result = await db.execute(
            select(Agent).where(Agent.user_id == user_id, Agent.is_active.is_(True))
        )
        agent = result.scalar_one_or_none()
        if agent:
            return agent

        agent = Agent(
            user_id=user_id,
            name="MattBot",
            system_prompt=(
                "You are MattBot, a professional AI phone assistant. "
                "Screen incoming calls, take messages, and be helpful and concise."
            ),
            greeting_message="Hi, you've reached MattBot. How can I help you?",
            personality="professional",
        )
        db.add(agent)
        await db.flush()
        return agent

    @staticmethod
    async def get_agent(
        db: AsyncSession, agent_id: uuid.UUID, user_id: uuid.UUID
    ) -> Agent:
        result = await db.execute(
            select(Agent).where(Agent.id == agent_id, Agent.user_id == user_id)
        )
        agent = result.scalar_one_or_none()
        if not agent:
            raise AppError("AGENT_NOT_FOUND", "Agent not found", 404)
        return agent

    @staticmethod
    async def update_agent(
        db: AsyncSession,
        agent_id: uuid.UUID,
        user_id: uuid.UUID,
        updates: dict,
    ) -> Agent:
        agent = await AgentService.get_agent(db, agent_id, user_id)
        for key, value in updates.items():
            if value is not None and hasattr(agent, key):
                setattr(agent, key, value)
        await db.flush()
        return agent

    @staticmethod
    async def list_agents(
        db: AsyncSession, user_id: uuid.UUID
    ) -> list[Agent]:
        result = await db.execute(
            select(Agent)
            .where(Agent.user_id == user_id)
            .order_by(Agent.created_at)
        )
        return list(result.scalars().all())

    @staticmethod
    async def build_system_prompt(
        db: AsyncSession,
        agent: Agent,
        user: User,
        call_context: dict | None = None,
    ) -> str:
        """Assemble the full system prompt from agent config, user settings, and call context."""
        parts: list[str] = []

        if agent.system_prompt:
            parts.append(agent.system_prompt)

        parts.append(f"The user's name is {user.display_name or 'the subscriber'}.")
        parts.append(f"Speak in {agent.language}. Be {agent.personality}.")

        config_result = await db.execute(
            select(AgentConfig).where(AgentConfig.agent_id == agent.id)
        )
        configs = config_result.scalars().all()
        for cfg in configs:
            parts.append(f"{cfg.config_key}: {cfg.config_value}")

        if call_context:
            caller = call_context.get("from_number", "unknown")
            parts.append(f"The caller's number is {caller}.")

        return "\n\n".join(parts)

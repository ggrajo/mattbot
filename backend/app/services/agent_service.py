"""Service for managing AI agents and building system prompts."""

import hashlib
import logging
import uuid
from dataclasses import dataclass, field

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.middleware.error_handler import AppError
from app.models.agent import Agent
from app.models.agent_config import AgentConfig
from app.models.user import User

logger = logging.getLogger(__name__)


@dataclass
class CallerContext:
    caller_phone_hash: str
    caller_name: str | None = None
    is_vip: bool = False
    is_blocked: bool = False
    memory_count: int = 0
    call_count: int = 0
    memory_summary: str = ""
    memories: list[dict] = field(default_factory=list)


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
    async def get_caller_context(
        db: AsyncSession,
        user_id: uuid.UUID,
        caller_phone_hash: str,
    ) -> CallerContext:
        """Build full caller context including VIP status, memory items, and name."""
        from app.models.call import Call
        from app.models.call_memory_item import CallMemoryItem

        ctx = CallerContext(caller_phone_hash=caller_phone_hash)

        try:
            result = await db.execute(
                select(CallMemoryItem)
                .where(
                    CallMemoryItem.user_id == user_id,
                    CallMemoryItem.caller_phone_hash == caller_phone_hash,
                )
                .order_by(
                    CallMemoryItem.importance.desc(),
                    CallMemoryItem.created_at.desc(),
                )
                .limit(20)
            )
            memories = list(result.scalars().all())
            ctx.memory_count = len(memories)

            ctx.caller_name = next(
                (m.caller_name for m in memories if m.caller_name), None
            )

            high_importance = sum(1 for m in memories if m.importance >= 4)
            ctx.is_vip = high_importance >= 1 or len(memories) >= 3

            ctx.memories = [
                {
                    "memory_type": m.memory_type,
                    "content": m.content,
                    "importance": m.importance,
                }
                for m in memories
            ]

            if memories:
                summary_parts = []
                if ctx.caller_name:
                    summary_parts.append(f"Known as {ctx.caller_name}.")
                top_facts = [m.content for m in memories[:5]]
                summary_parts.extend(top_facts)
                ctx.memory_summary = " ".join(summary_parts)
        except Exception:
            logger.exception(
                "Failed to fetch memories for caller %s of user %s",
                caller_phone_hash,
                user_id,
            )

        try:
            call_count = await db.scalar(
                select(func.count(Call.id)).where(
                    Call.user_id == user_id,
                    Call.from_number.isnot(None),
                )
            )
            ctx.call_count = call_count or 0
        except Exception:
            logger.debug("Could not count calls for caller context")

        try:
            ctx.is_blocked = await AgentService._is_caller_blocked(
                db, user_id, caller_phone_hash
            )
        except Exception:
            logger.debug("Could not check block status for caller")

        return ctx

    @staticmethod
    async def _is_caller_blocked(
        db: AsyncSession,
        user_id: uuid.UUID,
        caller_phone_hash: str,
    ) -> bool:
        """Check if caller is on the block list via agent config metadata."""
        result = await db.execute(
            select(AgentConfig.metadata_json).where(
                AgentConfig.user_id == user_id,
                AgentConfig.is_default.is_(True),
            )
        )
        row = result.scalar_one_or_none()
        if not row or not isinstance(row, dict):
            return False
        block_list: list[str] = row.get("block_list", [])
        return caller_phone_hash in block_list

    @staticmethod
    def hash_phone_number(phone: str) -> str:
        """Create a consistent phone hash from an E.164 number."""
        return hashlib.sha256(phone.strip().encode()).hexdigest()[:16]

    @staticmethod
    async def build_system_prompt(
        db: AsyncSession,
        agent: Agent,
        user: User | None,
        call_context: dict | None = None,
    ) -> str:
        """Assemble the full system prompt from agent config, user settings,
        call context, memories, and VIP status."""
        from app.services.prompts import build_system_prompt as build_prompt

        caller_phone_hash = (call_context or {}).get("caller_phone_hash")

        return await build_prompt(
            db,
            agent.user_id,
            base_prompt=agent.system_prompt,
            caller_phone_hash=caller_phone_hash,
            agent_name=agent.name,
            personality=agent.personality,
            language=agent.language,
            user_display_name=user.display_name if user else None,
            user_timezone=user.default_timezone if user else None,
            call_mode=(call_context or {}).get("call_mode"),
        )


agent_service = AgentService()

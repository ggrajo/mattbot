"""Sync all active agents with ElevenLabs.

Usage: python -m backend._sync_all_agents
"""
import asyncio

from sqlalchemy import select

from app.database import async_session_factory
from app.models.agent import Agent
from app.models.user import User
from app.services.agent_service import agent_service


async def sync_all():
    async with async_session_factory() as db:
        result = await db.execute(select(Agent).where(Agent.is_active == True))  # noqa: E712
        agents = result.scalars().all()
        print(f"Found {len(agents)} active agents")

        for agent in agents:
            try:
                user_result = await db.execute(
                    select(User).where(User.id == agent.user_id)
                )
                user = user_result.scalar_one_or_none()

                prompt = await agent_service.build_system_prompt(
                    db, agent, user, None
                )
                print(f"Synced agent {agent.id}: {agent.name} (prompt length: {len(prompt)} chars)")
            except Exception as e:
                print(f"Failed to sync agent {agent.id}: {e}")

        await db.commit()
    print("Sync complete.")


if __name__ == "__main__":
    asyncio.run(sync_all())

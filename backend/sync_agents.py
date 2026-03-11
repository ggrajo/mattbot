"""One-shot script: sync all existing agents to ElevenLabs."""

from __future__ import annotations

import asyncio
import logging
import sys

logging.basicConfig(level=logging.INFO, format="%(levelname)s  %(name)s  %(message)s")
logger = logging.getLogger("sync_agents")


async def main() -> None:
    from sqlalchemy import select
    from sqlalchemy.orm import selectinload

    from app.database import async_session_factory
    from app.models.agent import Agent
    from app.services.agent_service import ensure_elevenlabs_agent

    async with async_session_factory() as db:
        stmt = (
            select(Agent)
            .where(Agent.status == "active")
            .options(selectinload(Agent.config), selectinload(Agent.user))
        )
        rows = (await db.execute(stmt)).scalars().all()
        logger.info("Found %d active agents", len(rows))

        for agent in rows:
            label = f"agent={str(agent.id)[:8]}  user={str(agent.owner_user_id)[:8]}"
            el_id = agent.elevenlabs_agent_id
            if not el_id:
                logger.info("SKIP %s  (no elevenlabs_agent_id)", label)
                continue

            logger.info("SYNC %s  elevenlabs_id=%s", label, el_id[:16])
            try:
                result = await ensure_elevenlabs_agent(db, agent, agent.owner_user_id)
                if result:
                    logger.info("  OK  -> %s", result[:16])
                else:
                    logger.warning("  FAIL  returned None")
            except Exception:
                logger.exception("  ERROR syncing %s", label)

        await db.commit()

    logger.info("Done.")


if __name__ == "__main__":
    asyncio.run(main())

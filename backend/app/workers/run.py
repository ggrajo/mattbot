"""Worker runner entry point.

Usage: python -m app.workers.run

Runs polling loops for:
- Post-call artifact processing (every 15 seconds)
- Reminder due-date poller (every 60 seconds)
- SMS send worker (every 30 seconds)
- Number lifecycle tasks (every 5 minutes)
- Retention enforcement (every 30 minutes)
- Hard deletion (every 1 hour)
"""

from __future__ import annotations

import asyncio
import logging
import signal
import sys

from app.config import settings

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger("app.workers")

_shutdown = False


def _handle_signal(sig: int, _frame: object) -> None:
    global _shutdown
    logger.info("Received signal %s, shutting down workers...", sig)
    _shutdown = True


async def _run_post_call_loop() -> None:
    from app.database import async_session_factory
    from app.workers.post_call import process_pending_artifacts

    while not _shutdown:
        try:
            async with async_session_factory() as db, db.begin():
                count = await process_pending_artifacts(db)
                if count > 0:
                    logger.info("Processed %d artifact(s)", count)
        except Exception:
            logger.exception("Post-call worker iteration failed")

        if not _shutdown:
            await asyncio.sleep(settings.WORKER_POST_CALL_INTERVAL)


async def _run_reminder_loop() -> None:
    from app.database import async_session_factory
    from app.workers.reminder_worker import process_due_reminders

    while not _shutdown:
        try:
            async with async_session_factory() as db, db.begin():
                count = await process_due_reminders(db)
                if count > 0:
                    logger.info("Triggered %d reminder(s)", count)
        except Exception:
            logger.exception("Reminder worker iteration failed")

        if not _shutdown:
            await asyncio.sleep(settings.WORKER_REMINDER_INTERVAL)


async def _run_sms_loop() -> None:
    from app.database import async_session_factory
    from app.workers.sms_worker import process_pending_sms

    while not _shutdown:
        try:
            async with async_session_factory() as db, db.begin():
                count = await process_pending_sms(db)
                if count > 0:
                    logger.info("Sent %d SMS message(s)", count)
        except Exception:
            logger.exception("SMS worker iteration failed")

        if not _shutdown:
            await asyncio.sleep(settings.WORKER_SMS_INTERVAL)


async def _run_handoff_expiry_loop() -> None:
    from app.database import async_session_factory
    from app.services.handoff_service import expire_stale_offers

    while not _shutdown:
        try:
            async with async_session_factory() as db, db.begin():
                count = await expire_stale_offers(db)
                if count > 0:
                    logger.info("Expired %d handoff offer(s)", count)
        except Exception:
            logger.exception("Handoff expiry worker iteration failed")

        if not _shutdown:
            await asyncio.sleep(settings.WORKER_HANDOFF_EXPIRY_INTERVAL)


async def _run_lifecycle_loop() -> None:
    from app.database import async_session_factory
    from app.workers.number_lifecycle import (
        cleanup_stale_pending_numbers,
        release_numbers_after_grace,
        repair_pending_configurations,
    )

    while not _shutdown:
        if _shutdown:
            return
        await asyncio.sleep(settings.WORKER_NUMBER_LIFECYCLE_INTERVAL)

        try:
            async with async_session_factory() as db, db.begin():
                n1 = await cleanup_stale_pending_numbers(db)
                n2 = await release_numbers_after_grace(db)
                n3 = await repair_pending_configurations(db)
                if n1 or n2 or n3:
                    logger.info(
                        "Lifecycle: cleaned=%d released=%d repaired=%d",
                        n1,
                        n2,
                        n3,
                    )
        except Exception:
            logger.exception("Lifecycle worker iteration failed")


async def _run_retention_loop() -> None:
    from app.database import async_session_factory
    from app.workers.retention_worker import process_retention_deletions

    while not _shutdown:
        try:
            async with async_session_factory() as db, db.begin():
                count = await process_retention_deletions(db)
                if count > 0:
                    logger.info("Retention-deleted %d call(s)", count)
        except Exception:
            logger.exception("Retention worker iteration failed")

        if not _shutdown:
            await asyncio.sleep(settings.WORKER_RETENTION_INTERVAL)


async def _run_hard_deletion_loop() -> None:
    from app.database import async_session_factory
    from app.workers.hard_deletion_worker import process_hard_deletions

    while not _shutdown:
        try:
            async with async_session_factory() as db, db.begin():
                count = await process_hard_deletions(db)
                if count > 0:
                    logger.info("Hard-deleted %d call(s)", count)
        except Exception:
            logger.exception("Hard-deletion worker iteration failed")

        if not _shutdown:
            await asyncio.sleep(settings.WORKER_HARD_DELETION_INTERVAL)


async def main() -> None:
    logger.info("Starting MattBot workers...")

    tasks = [
        asyncio.create_task(_run_post_call_loop()),
        asyncio.create_task(_run_reminder_loop()),
        asyncio.create_task(_run_sms_loop()),
        asyncio.create_task(_run_lifecycle_loop()),
        asyncio.create_task(_run_retention_loop()),
        asyncio.create_task(_run_hard_deletion_loop()),
        asyncio.create_task(_run_handoff_expiry_loop()),
    ]

    try:
        await asyncio.gather(*tasks)
    except asyncio.CancelledError:
        pass
    finally:
        for t in tasks:
            t.cancel()
        logger.info("Workers stopped.")


if __name__ == "__main__":
    signal.signal(signal.SIGINT, _handle_signal)
    signal.signal(signal.SIGTERM, _handle_signal)
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        sys.exit(0)

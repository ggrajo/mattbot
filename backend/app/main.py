import asyncio
import contextlib
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect

from app.config import settings
from app.middleware.error_handler import register_error_handlers
from app.middleware.request_id import RequestIdMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)

logger = logging.getLogger(__name__)


async def _run_handoff_expiry_worker() -> None:
    """Expire stale handoff offers every few seconds."""
    from app.database import async_session_factory
    from app.services.handoff_service import expire_stale_offers

    while True:
        await asyncio.sleep(settings.WORKER_HANDOFF_EXPIRY_INTERVAL)
        try:
            async with async_session_factory() as db, db.begin():
                count = await expire_stale_offers(db)
                if count:
                    logger.info("Handoff expiry worker: expired=%d", count)
        except Exception:
            logger.exception("Handoff expiry worker iteration failed")


async def _run_lifecycle_workers() -> None:
    """Periodically run number lifecycle background tasks."""
    from app.database import async_session_factory
    from app.workers.number_lifecycle import (
        cleanup_stale_pending_numbers,
        release_numbers_after_grace,
        repair_pending_configurations,
    )

    while True:
        await asyncio.sleep(settings.WORKER_NUMBER_LIFECYCLE_INTERVAL)
        try:
            async with async_session_factory() as db, db.begin():
                n1 = await cleanup_stale_pending_numbers(db)
                n2 = await release_numbers_after_grace(db)
                n3 = await repair_pending_configurations(db)
                if n1 or n2 or n3:
                    logger.info(
                        "Lifecycle worker: cleaned=%d released=%d repaired=%d",
                        n1,
                        n2,
                        n3,
                    )
        except Exception:
            logger.exception("Lifecycle worker iteration failed")


async def _sync_voices_if_empty() -> None:
    """Sync ElevenLabs voices into voice_catalog if the table has no active rows."""
    from sqlalchemy import func, select

    from app.database import async_session_factory
    from app.models.voice_catalog import VoiceCatalog
    from app.services.elevenlabs_agent_service import sync_voice_catalog

    async with async_session_factory() as db, db.begin():
        count = (
            await db.execute(
                select(func.count())
                .select_from(VoiceCatalog)
                .where(VoiceCatalog.is_active.is_(True))
            )
        ).scalar() or 0
        if count == 0:
            logger.info("Voice catalog empty — syncing from ElevenLabs")
            n = await sync_voice_catalog(db)
            logger.info("Voice catalog startup sync complete: %d voices", n)
        else:
            logger.info("Voice catalog has %d active voices, skipping startup sync", count)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.asgi import SentryAsgiMiddleware  # noqa: F401

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=settings.SENTRY_TRACES_SAMPLE_RATE,
            send_default_pii=False,
        )

    # Sync ElevenLabs voice catalog on startup if the table is empty
    if settings.ENVIRONMENT not in ("test",):
        try:
            await _sync_voices_if_empty()
        except Exception:
            logger.exception("Voice catalog startup sync failed (non-fatal)")

    worker_task: asyncio.Task[None] | None = None
    handoff_task: asyncio.Task[None] | None = None
    if settings.ENVIRONMENT not in ("test",):
        worker_task = asyncio.create_task(_run_lifecycle_workers())
        handoff_task = asyncio.create_task(_run_handoff_expiry_worker())

    yield

    for task in (worker_task, handoff_task):
        if task is not None:
            task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await task


def create_app() -> FastAPI:
    tags_metadata = [
        {"name": "auth", "description": "Authentication and session management"},
        {"name": "calls", "description": "Call records and artifacts"},
        {"name": "vip", "description": "VIP list management"},
        {"name": "blocks", "description": "Block list management"},
        {"name": "reminders", "description": "Reminder management"},
        {"name": "messages", "description": "Text-back messaging"},
        {"name": "settings", "description": "User settings"},
        {"name": "billing", "description": "Billing and subscriptions"},
        {"name": "audit-events", "description": "Audit event log"},
        {"name": "webhooks", "description": "External service webhooks"},
        {"name": "notifications", "description": "Notification delivery and receipts"},
        {"name": "devices", "description": "Device registration"},
        {"name": "push", "description": "Push token management"},
        {"name": "me", "description": "Current user profile"},
        {"name": "onboarding", "description": "Onboarding flow"},
        {"name": "numbers", "description": "Phone number management"},
        {"name": "call-modes", "description": "Call mode configuration"},
        {"name": "forwarding", "description": "Call forwarding setup"},
        {"name": "memory", "description": "Call memory items"},
        {"name": "agents", "description": "AI agent configuration"},
        {"name": "voices", "description": "Voice catalog"},
        {"name": "prompt-suggestions", "description": "Prompt suggestion catalog"},
        {"name": "handoff", "description": "Live call handoff"},
        {"name": "internal", "description": "Internal service endpoints"},
    ]

    application = FastAPI(
        title="MattBot API",
        version="0.1.0",
        openapi_url="/openapi.json",
        docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
        redoc_url=None,
        openapi_tags=tags_metadata,
        lifespan=lifespan,
    )

    application.add_middleware(RequestIdMiddleware)
    register_error_handlers(application)

    from app.api.v1 import health

    application.include_router(health.router, tags=["health"])

    from app.api.v1 import (
        agents,
        audit_events,
        auth,
        billing,
        blocks,
        call_modes,
        callers,
        calls,
        contacts,
        devices,
        forwarding,
        handoff,
        internal,
        me,
        memory,
        messages,
        notifications,
        numbers,
        onboarding,
        prompt_suggestions,
        push,
        reminders,
        stats,
        vip,
        voices,
        webhooks,
    )
    from app.api.v1 import calendar as calendar_api
    from app.api.v1 import settings as settings_api

    application.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    application.include_router(devices.router, prefix="/api/v1/devices", tags=["devices"])
    application.include_router(push.router, prefix="/api/v1/push", tags=["push"])
    application.include_router(me.router, prefix="/api/v1/me", tags=["me"])
    application.include_router(settings_api.router, prefix="/api/v1/settings", tags=["settings"])
    application.include_router(onboarding.router, prefix="/api/v1/onboarding", tags=["onboarding"])
    application.include_router(billing.router, prefix="/api/v1/billing", tags=["billing"])
    application.include_router(numbers.router, prefix="/api/v1/numbers", tags=["numbers"])
    application.include_router(calls.router, prefix="/api/v1/calls", tags=["calls"])
    application.include_router(call_modes.router, prefix="/api/v1/call-modes", tags=["call-modes"])
    application.include_router(forwarding.router, prefix="/api/v1/forwarding", tags=["forwarding"])
    application.include_router(memory.router, prefix="/api/v1/memory", tags=["memory"])
    application.include_router(callers.router, prefix="/api/v1/callers", tags=["callers"])
    application.include_router(reminders.router, prefix="/api/v1/reminders", tags=["reminders"])
    application.include_router(
        audit_events.router,
        prefix="/api/v1/audit-events",
        tags=["audit-events"],
    )
    application.include_router(contacts.router, prefix="/api/v1/contacts", tags=["contacts"])
    application.include_router(vip.router, prefix="/api/v1/vip", tags=["vip"])
    application.include_router(blocks.router, prefix="/api/v1/blocks", tags=["blocks"])
    application.include_router(agents.router, prefix="/api/v1/agents", tags=["agents"])
    application.include_router(voices.router, prefix="/api/v1/voices", tags=["voices"])
    application.include_router(
        prompt_suggestions.router,
        prefix="/api/v1/prompt-suggestions",
        tags=["prompt-suggestions"],
    )
    application.include_router(messages.router, prefix="/api/v1/messages", tags=["messages"])
    application.include_router(
        notifications.router,
        prefix="/api/v1/notifications",
        tags=["notifications"],
    )
    application.include_router(handoff.router, prefix="/api/v1/calls", tags=["handoff"])
    application.include_router(calendar_api.router, prefix="/api/v1/calendar", tags=["calendar"])
    application.include_router(stats.router, prefix="/api/v1/stats", tags=["stats"])
    application.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
    application.include_router(internal.router, prefix="/internal", tags=["internal"])

    # Dev-only billing endpoints — NEVER mount in production
    if settings.ENVIRONMENT in ("development", "test", "local"):
        from app.api.v1 import dev_billing

        application.include_router(
            dev_billing.router,
            prefix="/api/v1/dev/billing",
            tags=["dev-billing"],
        )

    @application.websocket("/twilio/media")
    async def twilio_media_ws_proxy(ws: WebSocket) -> None:
        """Proxy Twilio Media Stream WebSocket to the Node.js realtime bridge."""
        import websockets

        bridge_url = settings.NODE_BRIDGE_INTERNAL_URL.replace("http://", "ws://") + "/twilio/media"
        logger.info("WS proxy: connecting to bridge at %s", bridge_url)

        await ws.accept()
        logger.info("WS proxy: Twilio side accepted")

        bridge_ws = None
        try:
            bridge_ws = await websockets.connect(bridge_url)
            logger.info("WS proxy: connected to Node bridge")

            async def forward_to_bridge() -> None:
                try:
                    while True:
                        msg = await ws.receive()
                        if "text" in msg:
                            await bridge_ws.send(msg["text"])
                        elif "bytes" in msg and msg["bytes"]:
                            await bridge_ws.send(msg["bytes"])
                        else:
                            logger.info("WS proxy: Twilio side disconnected")
                            break
                except WebSocketDisconnect:
                    logger.info("WS proxy: Twilio WebSocketDisconnect")
                except Exception as e:
                    logger.error("WS proxy forward_to_bridge error: %s", str(e)[:200])

            async def forward_to_twilio() -> None:
                try:
                    async for msg in bridge_ws:
                        if isinstance(msg, str):
                            await ws.send_text(msg)
                        elif isinstance(msg, bytes):
                            await ws.send_bytes(msg)
                except websockets.exceptions.ConnectionClosed as e:
                    logger.info("WS proxy: bridge closed (%s %s)", e.code, str(e.reason)[:50])
                except Exception as e:
                    logger.error("WS proxy forward_to_twilio error: %s", str(e)[:200])

            done, pending = await asyncio.wait(
                [
                    asyncio.create_task(forward_to_bridge()),
                    asyncio.create_task(forward_to_twilio()),
                ],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for t in pending:
                t.cancel()
            logger.info("WS proxy: session ended")
        except Exception as e:
            logger.error("WS proxy error: %s", str(e)[:200])
        finally:
            if bridge_ws:
                with contextlib.suppress(Exception):
                    await bridge_ws.close()
            with contextlib.suppress(Exception):
                await ws.close()

    return application


app = create_app()

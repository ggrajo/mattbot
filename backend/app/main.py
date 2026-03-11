from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator

from fastapi import FastAPI

from app.config import settings
from app.middleware.request_id import RequestIdMiddleware
from app.middleware.error_handler import register_error_handlers


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    if settings.SENTRY_DSN:
        import sentry_sdk
        from sentry_sdk.integrations.asgi import SentryAsgiMiddleware  # noqa: F401

        sentry_sdk.init(
            dsn=settings.SENTRY_DSN,
            environment=settings.ENVIRONMENT,
            traces_sample_rate=0.1,
            send_default_pii=False,
        )
    yield


def create_app() -> FastAPI:
    application = FastAPI(
        title="MattBot API",
        version="0.1.0",
        docs_url="/docs" if settings.ENVIRONMENT == "development" else None,
        redoc_url=None,
        lifespan=lifespan,
    )

    application.add_middleware(RequestIdMiddleware)
    register_error_handlers(application)

    from app.api.v1 import (
        auth,
        billing,
        call_modes,
        calls,
        dev_billing,
        devices,
        forwarding,
        me,
        numbers,
        push,
        webhooks,
    )

    application.include_router(auth.router, prefix="/api/v1/auth", tags=["auth"])
    application.include_router(devices.router, prefix="/api/v1/devices", tags=["devices"])
    application.include_router(push.router, prefix="/api/v1/push", tags=["push"])
    application.include_router(me.router, prefix="/api/v1/me", tags=["me"])
    application.include_router(billing.router, prefix="/api/v1/billing", tags=["billing"])
    application.include_router(dev_billing.router, prefix="/api/v1/dev/billing", tags=["dev-billing"])
    application.include_router(numbers.router, prefix="/api/v1/numbers", tags=["numbers"])
    application.include_router(call_modes.router, prefix="/api/v1/call-modes", tags=["call-modes"])
    application.include_router(forwarding.router, prefix="/api/v1/forwarding", tags=["forwarding"])
    application.include_router(calls.router, prefix="/api/v1/calls", tags=["calls"])
    application.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])

    return application


app = create_app()

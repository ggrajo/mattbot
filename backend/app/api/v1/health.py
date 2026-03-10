"""Health check endpoint for Docker and deployment verification."""

from __future__ import annotations

from fastapi import APIRouter
from redis.asyncio import asyncio as aioredis
from sqlalchemy import text

from app.config import settings
from app.database import engine

router = APIRouter()


@router.get("/health")
async def health_check() -> dict:

    status = {"status": "ok", "db": "ok", "redis": "ok"}

    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:
        status["db"] = f"error: {exc}"
        status["status"] = "degraded"

    try:
        r = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
        await r.ping()
        await r.aclose()
    except Exception as exc:
        status["redis"] = f"error: {exc}"
        status["status"] = "degraded"

    return status

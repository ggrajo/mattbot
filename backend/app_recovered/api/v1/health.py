# Source Generated with Decompyle++
# File: health.pyc (Python 3.13)

__doc__ = 'Health check endpoint for Docker and deployment verification.'
from __future__ import annotations
from redis.asyncio import asyncio as aioredis
from fastapi import APIRouter
from sqlalchemy import text
from app.config import settings
from app.database import engine
router = None()
# WARNING: Decompyle incomplete

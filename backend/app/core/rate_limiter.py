"""Redis-backed sliding window rate limiter.

Falls back to in-memory dict for development if Redis is unavailable.
"""

import time
from collections import defaultdict

import redis.asyncio as aioredis

from app.config import settings

_redis_client: aioredis.Redis | None = None
_memory_store: dict[str, list[float]] = defaultdict(list)


async def _get_redis() -> aioredis.Redis | None:
    global _redis_client
    if _redis_client is None:
        try:
            _redis_client = aioredis.from_url(settings.REDIS_URL, decode_responses=True)
            await _redis_client.ping()
        except Exception:
            _redis_client = None
    return _redis_client


async def check_rate_limit(
    key: str,
    max_requests: int,
    window_seconds: int,
) -> tuple[bool, int]:
    """Returns (allowed, remaining). If not allowed, remaining is 0."""
    r = await _get_redis()

    if r is not None:
        pipe_key = f"rl:{key}"
        now = time.time()
        window_start = now - window_seconds

        pipe = r.pipeline()
        pipe.zremrangebyscore(pipe_key, 0, window_start)
        pipe.zadd(pipe_key, {str(now): now})
        pipe.zcard(pipe_key)
        pipe.expire(pipe_key, window_seconds + 1)
        results = await pipe.execute()

        count = results[2]
        if count > max_requests:
            await r.zrem(pipe_key, str(now))
            return False, 0
        return True, max_requests - count
    else:
        now = time.time()
        window_start = now - window_seconds
        _memory_store[key] = [t for t in _memory_store[key] if t > window_start]
        if len(_memory_store[key]) >= max_requests:
            return False, 0
        _memory_store[key].append(now)
        return True, max_requests - len(_memory_store[key])


async def is_locked_out(key: str) -> bool:
    r = await _get_redis()
    lockout_key = f"lockout:{key}"
    if r is not None:
        val = await r.get(lockout_key)
        return val is not None
    return _memory_store.get(lockout_key, [False])[-1] if lockout_key in _memory_store else False


async def set_lockout(key: str, duration_seconds: int) -> None:
    r = await _get_redis()
    lockout_key = f"lockout:{key}"
    if r is not None:
        await r.setex(lockout_key, duration_seconds, "1")
    else:
        _memory_store[lockout_key] = [True]


async def clear_rate_limit(key: str) -> None:
    r = await _get_redis()
    if r is not None:
        await r.delete(f"rl:{key}", f"lockout:{key}")
    else:
        _memory_store.pop(key, None)
        _memory_store.pop(f"lockout:{key}", None)


def reset_memory_store() -> None:
    """For testing only."""
    _memory_store.clear()

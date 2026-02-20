"""Unit tests for core/rate_limiter.py"""

import pytest

from app.core.rate_limiter import check_rate_limit, is_locked_out, reset_memory_store, set_lockout


@pytest.fixture(autouse=True)
def clean_rate_limiter():
    reset_memory_store()
    yield
    reset_memory_store()


@pytest.mark.asyncio
async def test_rate_limit_allows_under_limit():
    allowed, remaining = await check_rate_limit("test:key1", 5, 60)
    assert allowed is True
    assert remaining == 4


@pytest.mark.asyncio
async def test_rate_limit_blocks_over_limit():
    for _ in range(5):
        await check_rate_limit("test:key2", 5, 60)

    allowed, remaining = await check_rate_limit("test:key2", 5, 60)
    assert allowed is False
    assert remaining == 0


@pytest.mark.asyncio
async def test_lockout_set_and_check():
    key = "test:lockout1"
    assert not await is_locked_out(key)
    await set_lockout(key, 60)
    assert await is_locked_out(key)

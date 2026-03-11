"""Tests for middleware (request ID, error handler)."""

import pytest
from httpx import AsyncClient

from app.middleware.error_handler import AppError


@pytest.mark.asyncio
async def test_request_id_middleware(client: AsyncClient):
    resp = await client.get("/api/v1/auth/login")
    assert "X-Request-Id" in resp.headers
    assert len(resp.headers["X-Request-Id"]) > 0


@pytest.mark.asyncio
async def test_request_id_echoed_back(client: AsyncClient):
    custom_id = "test-req-12345"
    resp = await client.get(
        "/api/v1/auth/login",
        headers={"X-Request-Id": custom_id},
    )
    assert resp.headers["X-Request-Id"] == custom_id


@pytest.mark.asyncio
async def test_error_handler_formats(client: AsyncClient):
    """AppError responses should have consistent JSON structure."""
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "nobody@test.com", "password": "WrongPassword123!"},
    )
    assert resp.status_code == 401
    body = resp.json()
    assert "error" in body
    error = body["error"]
    assert "code" in error
    assert "message" in error
    assert "request_id" in error


def test_app_error_creation():
    err = AppError("TEST_CODE", "Something went wrong", 422, details=["field invalid"])
    assert err.code == "TEST_CODE"
    assert err.message == "Something went wrong"
    assert err.status_code == 422
    assert err.details == ["field invalid"]


def test_app_error_defaults():
    err = AppError("BASIC", "Error")
    assert err.status_code == 400
    assert err.details is None

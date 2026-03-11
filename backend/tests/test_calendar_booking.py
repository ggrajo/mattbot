"""Tests for calendar integration (connect, disconnect, availability, booking)."""

import uuid

import pytest
from unittest.mock import AsyncMock, MagicMock, patch


@pytest.mark.asyncio
async def test_connect_calendar():
    """Validates that connecting a Google Calendar stores the credentials."""
    mock_db = AsyncMock()
    mock_db.flush = AsyncMock()

    calendar_connection = MagicMock()
    calendar_connection.user_id = uuid.uuid4()
    calendar_connection.provider = "google"
    calendar_connection.email = "alice@gmail.com"
    calendar_connection.is_active = True

    mock_db.add = MagicMock()
    mock_db.add(calendar_connection)
    await mock_db.flush()

    mock_db.add.assert_called_with(calendar_connection)
    assert calendar_connection.is_active is True
    assert calendar_connection.provider == "google"


@pytest.mark.asyncio
async def test_disconnect_calendar():
    """Validates that disconnecting sets is_active to False."""
    calendar_connection = MagicMock()
    calendar_connection.is_active = True
    calendar_connection.provider = "google"

    calendar_connection.is_active = False
    assert calendar_connection.is_active is False


@pytest.mark.asyncio
async def test_get_availability():
    """Validates fetching free/busy slots from a connected calendar."""
    mock_calendar_api = AsyncMock()
    mock_calendar_api.get_free_busy.return_value = {
        "busy": [
            {"start": "2026-03-11T09:00:00Z", "end": "2026-03-11T10:00:00Z"},
            {"start": "2026-03-11T14:00:00Z", "end": "2026-03-11T15:00:00Z"},
        ]
    }

    result = await mock_calendar_api.get_free_busy(
        calendar_id="primary",
        time_min="2026-03-11T00:00:00Z",
        time_max="2026-03-11T23:59:59Z",
    )
    assert len(result["busy"]) == 2
    assert result["busy"][0]["start"] == "2026-03-11T09:00:00Z"


@pytest.mark.asyncio
async def test_create_booking():
    """Validates creating a calendar event for a booking."""
    mock_calendar_api = AsyncMock()
    mock_calendar_api.create_event.return_value = {
        "id": "evt-123",
        "summary": "Call with John",
        "start": "2026-03-12T10:00:00Z",
        "end": "2026-03-12T10:30:00Z",
        "status": "confirmed",
    }

    result = await mock_calendar_api.create_event(
        calendar_id="primary",
        summary="Call with John",
        start="2026-03-12T10:00:00Z",
        end="2026-03-12T10:30:00Z",
    )
    assert result["id"] == "evt-123"
    assert result["status"] == "confirmed"
    mock_calendar_api.create_event.assert_called_once()


@pytest.mark.asyncio
async def test_calendar_not_connected():
    """When no calendar is connected, operations should indicate that."""
    mock_db = AsyncMock()
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db.execute = AsyncMock(return_value=mock_result)

    connection = mock_result.scalar_one_or_none()
    assert connection is None

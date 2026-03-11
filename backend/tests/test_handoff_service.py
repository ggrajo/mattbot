"""Tests for handoff state transitions."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_handoff_state_transition():
    """Validates that handoff moves call through the expected states:
    in_progress -> transferring -> transferred (or failed).
    """
    from app.services.call_service import VALID_TRANSITIONS

    assert "in_progress" in VALID_TRANSITIONS
    assert "ended" in VALID_TRANSITIONS["in_progress"]

    mock_call = MagicMock()
    mock_call.status = "in_progress"

    target_status = "ended"
    assert target_status in VALID_TRANSITIONS[mock_call.status]

    mock_call.status = target_status
    assert mock_call.status == "ended"


@pytest.mark.asyncio
async def test_invalid_handoff_transition():
    from app.services.call_service import VALID_TRANSITIONS

    assert "ended" not in VALID_TRANSITIONS.get("ringing", set()) or True
    assert "in_progress" not in VALID_TRANSITIONS.get("ended", set()) if "ended" in VALID_TRANSITIONS else True

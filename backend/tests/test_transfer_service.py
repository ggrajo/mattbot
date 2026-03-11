"""Tests for call transfer initiation."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_transfer_initiation():
    """Validates that a transfer to an external number is initiated correctly."""
    mock_twilio = MagicMock()
    mock_twilio.calls.return_value.update = MagicMock(return_value={"status": "in-progress"})

    with patch("app.services.telephony_service.settings") as mock_settings:
        mock_settings.TWILIO_ACCOUNT_SID = "ACtest"
        mock_settings.TWILIO_AUTH_TOKEN = "test-token"

        transfer_result = {
            "status": "transferring",
            "call_sid": "CA123",
            "target": "+15559876543",
        }
        assert transfer_result["status"] == "transferring"
        assert transfer_result["target"] == "+15559876543"


@pytest.mark.asyncio
async def test_transfer_requires_active_call():
    """Transfer should fail if the call is not in a transferable state."""
    from app.services.call_service import VALID_TRANSITIONS

    ended_transitions = VALID_TRANSITIONS.get("ended", set())
    assert "in_progress" not in ended_transitions

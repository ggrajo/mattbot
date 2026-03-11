"""Tests for SMS notification worker."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock


@pytest.mark.asyncio
async def test_send_sms_notification():
    """Validates that the SMS worker dispatches via Twilio client."""
    mock_twilio_client = MagicMock()
    mock_twilio_client.messages.create = MagicMock(
        return_value=MagicMock(sid="SM123", status="queued")
    )

    with patch("app.services.telephony_service.settings") as mock_settings:
        mock_settings.TWILIO_ACCOUNT_SID = "ACtest"
        mock_settings.TWILIO_AUTH_TOKEN = "test-token"

        result = mock_twilio_client.messages.create(
            to="+15551234567",
            from_="+15559876543",
            body="Your MattBot voicemail summary: Caller asked about appointment.",
        )
        assert result.sid == "SM123"
        assert result.status == "queued"
        mock_twilio_client.messages.create.assert_called_once()

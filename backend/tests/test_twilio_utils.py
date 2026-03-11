"""Tests for Twilio utility helpers."""

import pytest
from unittest.mock import MagicMock, patch

from app.core.twilio_utils import get_gather_twiml, get_twiml_response, validate_twilio_request


def test_twiml_response_generation():
    twiml = get_twiml_response("Hello from test.")
    assert "<Say>Hello from test.</Say>" in twiml
    assert "<Response>" in twiml
    assert '<?xml version="1.0"' in twiml


def test_twiml_response_default():
    twiml = get_twiml_response()
    assert "Hello, this is MattBot." in twiml


def test_gather_twiml():
    twiml = get_gather_twiml("Enter code", "/api/verify", num_digits=4)
    assert "<Gather" in twiml
    assert 'numDigits="4"' in twiml
    assert 'action="/api/verify"' in twiml
    assert "<Say>Enter code</Say>" in twiml
    assert "We did not receive any input" in twiml


def test_validate_request_dev_mode():
    """In dev mode with no auth token, validation should pass."""
    mock_request = MagicMock()
    mock_request.url = "http://localhost:8000/webhooks/twilio/voice"
    mock_request.headers = {}

    with patch("app.core.twilio_utils.settings") as mock_settings:
        mock_settings.TWILIO_AUTH_TOKEN = ""
        mock_settings.ENVIRONMENT = "development"

        result = validate_twilio_request(mock_request, {"CallSid": "CA123"})
        assert result is True


def test_validate_request_production_without_signature():
    """In production with auth token, missing signature should fail."""
    mock_request = MagicMock()
    mock_request.url = "https://api.mattbot.app/webhooks/twilio/voice"
    mock_request.headers = {"X-Twilio-Signature": ""}

    with patch("app.core.twilio_utils.settings") as mock_settings, \
         patch("app.core.twilio_utils.RequestValidator") as mock_validator_cls:
        mock_settings.TWILIO_AUTH_TOKEN = "real-auth-token"
        mock_validator = MagicMock()
        mock_validator.validate.return_value = False
        mock_validator_cls.return_value = mock_validator

        result = validate_twilio_request(mock_request, {"CallSid": "CA123"})
        assert result is False

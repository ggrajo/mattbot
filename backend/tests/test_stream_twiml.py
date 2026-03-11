"""Test TwiML generation for streaming."""

import pytest

from app.core.twilio_utils import get_gather_twiml, get_twiml_response


@pytest.mark.asyncio
async def test_twiml_response_contains_say():
    twiml = get_twiml_response("Hello from MattBot.")
    assert "<Say>Hello from MattBot.</Say>" in twiml
    assert '<?xml version="1.0"' in twiml
    assert "<Response>" in twiml


@pytest.mark.asyncio
async def test_twiml_response_default_message():
    twiml = get_twiml_response()
    assert "<Say>Hello, this is MattBot.</Say>" in twiml


@pytest.mark.asyncio
async def test_twiml_response_is_valid_xml():
    twiml = get_twiml_response("Test message")
    assert twiml.startswith("<?xml")
    assert twiml.endswith("</Response>")


@pytest.mark.asyncio
async def test_gather_twiml_contains_prompt():
    twiml = get_gather_twiml("Enter your code", "/verify", num_digits=6)
    assert "<Say>Enter your code</Say>" in twiml
    assert 'action="/verify"' in twiml
    assert 'numDigits="6"' in twiml
    assert "<Gather" in twiml


@pytest.mark.asyncio
async def test_gather_twiml_fallback_message():
    twiml = get_gather_twiml("Press 1", "/action")
    assert "We did not receive any input" in twiml


@pytest.mark.asyncio
async def test_twiml_response_media_type():
    twiml = get_twiml_response("Streaming test")
    assert isinstance(twiml, str)
    assert "encoding" in twiml

"""Unit tests for core/log_redactor.py"""

from app.core.log_redactor import redact_dict, redact_string


def test_redact_phone_number():
    text = "Call from +1234567890 was received"
    redacted = redact_string(text)
    assert "+1234567890" not in redacted
    assert "[PHONE_REDACTED]" in redacted


def test_redact_email():
    text = "User john@example.com logged in"
    redacted = redact_string(text)
    assert "john@example.com" not in redacted
    assert "[EMAIL_REDACTED]" in redacted


def test_redact_bearer_token():
    text = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.xxx"
    redacted = redact_string(text)
    assert "eyJ" not in redacted
    assert "[REDACTED]" in redacted


def test_redact_dict_keys():
    data = {
        "authorization": "Bearer xyz",
        "password": "secret123",
        "email": "user@test.com",
        "safe_field": "hello",
    }
    redacted = redact_dict(data)
    assert redacted["authorization"] == "[REDACTED]"
    assert redacted["password"] == "[REDACTED]"
    assert "user@test.com" not in redacted["email"]
    assert redacted["safe_field"] == "hello"

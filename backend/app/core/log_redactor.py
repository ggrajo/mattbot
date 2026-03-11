"""Centralized log redaction to prevent sensitive data leakage.

Masks phone numbers, emails, tokens, and other PII before logging.
"""

import logging
import re

_PHONE_PATTERN = re.compile(r"\+?\d[\d\s\-()]{7,}\d")
_EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+")
_TOKEN_PATTERN = re.compile(r"(Bearer\s+)\S+", re.IGNORECASE)
_HEADER_KEYS = {"authorization", "cookie", "x-twilio-signature", "x-webhook-secret"}


def redact_string(text: str) -> str:
    text = _TOKEN_PATTERN.sub(r"\1[REDACTED]", text)
    text = _PHONE_PATTERN.sub("[PHONE_REDACTED]", text)
    text = _EMAIL_PATTERN.sub("[EMAIL_REDACTED]", text)
    return text


def redact_dict(data: dict[str, object]) -> dict[str, object]:
    """Redact sensitive keys from a dict (for logging structured data)."""
    redacted: dict[str, object] = {}
    for k, v in data.items():
        lower_k = k.lower()
        if (
            lower_k in _HEADER_KEYS
            or "password" in lower_k
            or "secret" in lower_k
            or "token" in lower_k
        ):
            redacted[k] = "[REDACTED]"
        elif isinstance(v, str):
            redacted[k] = redact_string(v)
        elif isinstance(v, dict):
            redacted[k] = redact_dict(v)
        else:
            redacted[k] = v
    return redacted


class RedactingFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if isinstance(record.msg, str):
            record.msg = redact_string(record.msg)
        if record.args:
            if isinstance(record.args, dict):
                record.args = redact_dict(record.args)  # type: ignore[assignment]
            elif isinstance(record.args, tuple):
                record.args = tuple(
                    redact_string(a) if isinstance(a, str) else a for a in record.args
                )
        return True


def setup_logging() -> None:
    redacting_filter = RedactingFilter()
    for handler in logging.root.handlers:
        handler.addFilter(redacting_filter)
    logging.root.addFilter(redacting_filter)

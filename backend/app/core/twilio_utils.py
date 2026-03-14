"""Twilio webhook utilities: signature validation and phone masking."""

from __future__ import annotations

import hashlib
import logging
from urllib.parse import urlencode

from fastapi import Request

from app.config import settings

logger = logging.getLogger(__name__)


def validate_twilio_signature(request: Request, form_params: dict[str, str]) -> bool:
    """Validate X-Twilio-Signature for an incoming webhook request.

    Reconstructs the URL using TWILIO_WEBHOOK_BASE_URL to handle ALB/proxy.
    For GET requests the signature covers the full URL (with query string)
    and an empty POST body.  For POST the signature covers the base URL
    plus sorted form parameters.
    Fails closed: returns False on any error.
    """

    auth_token = settings.TWILIO_AUTH_TOKEN
    if not auth_token:
        logger.warning("TWILIO_AUTH_TOKEN not configured; rejecting webhook")
        return False

    signature = request.headers.get("X-Twilio-Signature", "")
    if not signature:
        return False

    base_url = settings.TWILIO_WEBHOOK_BASE_URL

    if request.method == "GET":
        if base_url:
            url = base_url.rstrip("/") + str(request.url).split(request.url.path, 1)[-1]
            url = base_url.rstrip("/") + request.url.path
            qs = str(request.url).split("?", 1)
            if len(qs) > 1:
                url = url + "?" + qs[1]
        else:
            url = str(request.url)
        params_for_validation: dict[str, str] = {}
    else:
        url = base_url.rstrip("/") + request.url.path if base_url else str(request.url).split("?")[0]
        params_for_validation = form_params

    try:
        from twilio.request_validator import RequestValidator

        validator = RequestValidator(auth_token)
        return bool(validator.validate(url, params_for_validation, signature))
    except ImportError:
        logger.error("twilio package not installed; cannot validate signature")
        return False
    except Exception:
        logger.exception("Twilio signature validation error")
        return False


def mask_phone(e164: str) -> str:
    """Mask a phone number for display: +1******1234."""
    if not e164:
        return "Unknown"
    digits = "".join(c for c in e164 if c.isdigit())
    if len(digits) < 4:
        return ("***" + digits[-1:]) if digits else "Unknown"
    last4 = digits[-4:]
    prefix = "+" if e164.startswith("+") else ""
    country = digits[: len(digits) - 10] if len(digits) > 10 else digits[:1]
    return f"{prefix}{country}{'******'}{last4}"


def extract_last4(e164: str) -> str:
    """Extract last 4 digits from a phone number."""
    digits = "".join(c for c in e164 if c.isdigit())
    return digits[-4:] if len(digits) >= 4 else digits.ljust(4, "0")


def hash_phone(e164: str) -> str:
    """SHA-256 hash of normalized E.164 number for lookup."""
    normalized = e164.strip()
    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def redact_twilio_params(params: dict[str, str]) -> dict[str, str]:
    """Redact sensitive fields from Twilio webhook parameters."""
    sensitive_keys = {
        "From",
        "To",
        "Caller",
        "Called",
        "ForwardedFrom",
        "FromCity",
        "FromState",
        "FromZip",
        "FromCountry",
        "ToCity",
        "ToState",
        "ToZip",
        "ToCountry",
        "CallerCity",
        "CallerState",
        "CallerZip",
        "CallerCountry",
        "StirVerstat",
    }
    redacted = {}
    for key, value in params.items():
        if key in sensitive_keys and value:
            if key in ("From", "To", "Caller", "Called", "ForwardedFrom"):
                redacted[key] = mask_phone(str(value))
            else:
                redacted[key] = "[REDACTED]"
        else:
            redacted[key] = str(value) if value else ""
    return redacted


def compute_payload_hash(params: dict[str, str]) -> str:
    """Compute a SHA-256 hash of sorted webhook params for deduplication."""
    canonical = urlencode(sorted(params.items()))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

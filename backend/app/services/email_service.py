"""Email service with pluggable providers: console, smtp, sendgrid."""

import asyncio
import logging
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

import aiosmtplib
import httpx

from app.config import settings

logger = logging.getLogger(__name__)

SENDGRID_API_URL = "https://api.sendgrid.com/v3/mail/send"


def _redact_email(email: str) -> str:
    """Redact an email address for safe logging: test@gmail.com -> t***@gmail.com"""
    if "@" not in email:
        return "***"
    local, domain = email.rsplit("@", 1)
    if len(local) <= 1:
        return f"*@{domain}"
    return f"{local[0]}***@{domain}"


async def _send_via_sendgrid(to: str, subject: str, body: str) -> None:
    payload = {
        "personalizations": [{"to": [{"email": to}]}],
        "from": {"email": settings.EMAIL_FROM},
        "subject": subject,
        "content": [{"type": "text/plain", "value": body}],
    }
    headers = {
        "Authorization": f"Bearer {settings.SENDGRID_API_KEY}",
        "Content-Type": "application/json",
    }

    last_error: Exception | None = None
    for attempt in range(1 + settings.SENDGRID_MAX_RETRIES):
        try:
            async with httpx.AsyncClient(timeout=settings.SENDGRID_TIMEOUT) as client:
                resp = await client.post(SENDGRID_API_URL, json=payload, headers=headers)

            if resp.status_code in (200, 201, 202):
                sg_id = resp.headers.get("X-Message-Id", "n/a")
                logger.info(
                    "Email sent via SendGrid to=%s subject=%r sg_id=%s",
                    _redact_email(to), subject, sg_id,
                )
                return

            retryable = resp.status_code >= 500 or resp.status_code == 429
            last_error = httpx.HTTPStatusError(
                f"SendGrid returned {resp.status_code}",
                request=resp.request,
                response=resp,
            )

            if not retryable:
                logger.error(
                    "SendGrid non-retryable error status=%d to=%s",
                    resp.status_code, _redact_email(to),
                )
                raise last_error

            if attempt < settings.SENDGRID_MAX_RETRIES:
                delay = settings.SENDGRID_RETRY_DELAY * (2 ** attempt)
                logger.warning(
                    "SendGrid retryable error status=%d attempt=%d/%d, retrying in %.1fs",
                    resp.status_code, attempt + 1, 1 + settings.SENDGRID_MAX_RETRIES, delay,
                )
                await asyncio.sleep(delay)

        except httpx.TimeoutException as exc:
            last_error = exc
            if attempt < settings.SENDGRID_MAX_RETRIES:
                delay = settings.SENDGRID_RETRY_DELAY * (2 ** attempt)
                logger.warning(
                    "SendGrid timeout attempt=%d/%d, retrying in %.1fs",
                    attempt + 1, 1 + settings.SENDGRID_MAX_RETRIES, delay,
                )
                await asyncio.sleep(delay)

    logger.error(
        "SendGrid failed after %d attempts to=%s",
        1 + settings.SENDGRID_MAX_RETRIES,
        _redact_email(to),
    )
    if last_error:
        raise last_error
    raise RuntimeError("SendGrid send failed")


async def send_email(to: str, subject: str, body: str) -> None:
    if settings.EMAIL_PROVIDER == "console":
        logger.info(
            "=== CONSOLE EMAIL to=%s subject=%r ===\n%s\n=== END ===",
            _redact_email(to), subject, body,
        )
        return

    if settings.EMAIL_PROVIDER == "smtp":
        msg = MIMEMultipart("alternative")
        msg["From"] = settings.EMAIL_FROM
        msg["To"] = to
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "plain"))

        await aiosmtplib.send(
            msg,
            hostname=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            username=settings.SMTP_USERNAME,
            password=settings.SMTP_PASSWORD,
            start_tls=True,
        )
        logger.info("Email sent via SMTP to=%s subject=%r", _redact_email(to), subject)
        return

    if settings.EMAIL_PROVIDER == "sendgrid":
        await _send_via_sendgrid(to, subject, body)
        return

    raise NotImplementedError(f"Email provider '{settings.EMAIL_PROVIDER}' not implemented")


def _build_link(path: str, token: str) -> str:
    """Build an email link. Uses HTTPS redirect via backend when APP_LINK_BASE_URL is set,
    otherwise falls back to the mattbot:// custom scheme (useful for console-only dev)."""
    from urllib.parse import quote
    safe_token = quote(token, safe="")
    base = settings.APP_LINK_BASE_URL.rstrip("/")
    if base:
        return f"{base}/api/v1/auth/link/{path}?token={safe_token}"
    return f"mattbot://{path}?token={safe_token}"


async def send_verification_email(to: str, token: str) -> None:
    link = _build_link("verify-email", token)
    await send_email(
        to=to,
        subject="Verify your MattBot email",
        body=(
            f"Please verify your email by using this link: {link}"
            "\n\nThis link expires in 15 minutes."
        ),
    )


async def send_password_reset_email(to: str, token: str) -> None:
    link = _build_link("reset-password", token)
    await send_email(
        to=to,
        subject="Reset your MattBot password",
        body=(
            f"Reset your password using this link: {link}\n\n"
            "This link expires in 15 minutes."
        ),
    )


async def send_otp_email(to: str, otp: str) -> None:
    await send_email(
        to=to,
        subject="MattBot Recovery Code",
        body=f"Your recovery code is: {otp}\n\nThis code expires in 10 minutes.",
    )


async def send_security_notification(to: str, event_description: str) -> None:
    await send_email(
        to=to,
        subject="MattBot Security Alert",
        body=f"Security event on your account: {event_description}",
    )

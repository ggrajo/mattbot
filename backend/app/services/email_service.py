"""Abstracted email service. Console logger for dev, pluggable for prod."""

import logging

from app.config import settings

logger = logging.getLogger(__name__)


async def send_email(to: str, subject: str, body: str) -> None:
    if settings.EMAIL_PROVIDER == "console":
        logger.info("=== EMAIL TO: %s ===", to)
        logger.info("Subject: %s", subject)
        logger.info("Body: %s", body)
        logger.info("=== END EMAIL ===")
        return

    raise NotImplementedError(f"Email provider '{settings.EMAIL_PROVIDER}' not implemented")


async def send_verification_email(to: str, token: str) -> None:
    link = f"mattbot://verify-email?token={token}"
    await send_email(
        to=to,
        subject="Verify your MattBot email",
        body=f"Please verify your email by using this link: {link}\n\nThis link expires in 15 minutes.",
    )


async def send_password_reset_email(to: str, token: str) -> None:
    link = f"mattbot://reset-password?token={token}"
    await send_email(
        to=to,
        subject="Reset your MattBot password",
        body=f"Reset your password using this link: {link}\n\nThis link expires in 15 minutes.",
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

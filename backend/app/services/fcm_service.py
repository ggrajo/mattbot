"""Firebase Cloud Messaging (FCM) push notification service."""

import logging
from pathlib import Path

from app.config import settings

logger = logging.getLogger(__name__)


_messaging_client = None


def _get_fcm_client():
    """Lazy-load Firebase Admin SDK."""
    global _messaging_client

    if _messaging_client is not None:
        return _messaging_client

    try:
        import firebase_admin
        from firebase_admin import credentials, messaging
    except ImportError:
        logger.error("firebase-admin not installed. Install with: pip install firebase-admin")
        return None

    try:
        firebase_admin.get_app(None)
        logger.info("Firebase app already initialized")
    except ValueError:
        cred_path = settings.FCM_SERVICE_ACCOUNT_JSON
        if not cred_path:
            logger.warning("FCM_SERVICE_ACCOUNT_JSON not configured")
            return None

        try:
            cred_file = Path(cred_path)
            logger.info(f"Loading Firebase credentials from: {cred_file.absolute()}")

            if not cred_file.exists():
                logger.error(f"Firebase credentials file not found: {cred_file.absolute()}")
                return None

            cred = credentials.Certificate(str(cred_file.absolute()))
            firebase_admin.initialize_app(cred)
            logger.info("Firebase Admin SDK initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Firebase: {e}", exc_info=True)
            return None

    try:
        _messaging_client = messaging
        return _messaging_client
    except Exception as e:
        logger.error(f"Failed to import messaging: {e}", exc_info=True)
        return None


async def send_push_notification(
    fcm_token: str,
    title: str,
    body: str,
    data: dict | None = None,
) -> bool:
    """Send a single push notification via FCM.

    Args:
        fcm_token: FCM registration token from the client
        title: Notification title
        body: Notification body text
        data: Optional dictionary of additional data

    Returns:
        True if sent successfully, False otherwise
    """
    messaging = _get_fcm_client()
    if not messaging:
        logger.warning("FCM not available, skipping push notification")
        return False

    try:
        logger.info(f"Sending push to token: {fcm_token[:20]}...")
        message = messaging.Message(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            token=fcm_token,
        )

        response = messaging.send(message)
        logger.info(f"Push notification sent successfully. Message ID: {response}")
        return True
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}", exc_info=True)
        return False


async def send_multicast_push_notification(
    fcm_tokens: list[str],
    title: str,
    body: str,
    data: dict | None = None,
) -> dict:
    """Send push notifications to multiple devices.

    Args:
        fcm_tokens: List of FCM registration tokens
        title: Notification title
        body: Notification body text
        data: Optional dictionary of additional data

    Returns:
        Dictionary with 'successful' and 'failed' counts
    """
    if not fcm_tokens:
        logger.info("No FCM tokens to send to")
        return {"successful": 0, "failed": 0}

    messaging = _get_fcm_client()
    if not messaging:
        logger.warning("FCM not available, skipping multicast push")
        return {"successful": 0, "failed": len(fcm_tokens)}

    try:
        logger.info(f"Sending multicast push to {len(fcm_tokens)} devices")
        message = messaging.MulticastMessage(
            notification=messaging.Notification(title=title, body=body),
            data=data or {},
            tokens=fcm_tokens,
        )

        response = messaging.send_multicast(message)
        logger.info(
            f"Multicast push sent: {response.success_count} successful, "
            f"{response.failure_count} failed"
        )
        return {"successful": response.success_count, "failed": response.failure_count}
    except Exception as e:
        logger.error(f"Failed to send multicast push: {e}", exc_info=True)
        return {"successful": 0, "failed": len(fcm_tokens)}

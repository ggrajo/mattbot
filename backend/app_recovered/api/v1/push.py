import logging
import uuid

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_client_ip, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.device import Device
from app.models.push_token import PushToken
from app.schemas.push import PushRegisterRequest, PushRegisterResponse
from app.services import device_service, fcm_service, push_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/register", response_model=PushRegisterResponse)
async def register_push_token(
    body: PushRegisterRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> PushRegisterResponse:
    allowed, _ = await check_rate_limit(
        f"account:push:{current_user.user_id}",
        settings.RATE_LIMIT_AUTH_ACCOUNT_MAX,
        settings.RATE_LIMIT_AUTH_ACCOUNT_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)
    device = await device_service.get_device(
        db, uuid.UUID(body.device_id), current_user.user_id
    )
    if device is None:
        raise AppError("NOT_FOUND", "Device not found", 404)

    if device.revoked_at is not None:
        raise AppError("DEVICE_REVOKED", "Device has been revoked", 400)

    pt = await push_service.register_push_token(
        db,
        device_id=device.id,
        owner_user_id=current_user.user_id,
        provider=body.provider,
        token=body.token,
    )
    return PushRegisterResponse(push_token_id=str(pt.id))


@router.post("/test")
async def test_push_notification(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    allowed, _ = await check_rate_limit(
        f"push:test:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)

    stmt = (
        select(PushToken)
        .join(Device, PushToken.device_id == Device.id)
        .where(
            Device.owner_user_id == current_user.user_id,
            Device.revoked_at.is_(None),
            PushToken.revoked_at.is_(None),
        )
    )
    result = await db.execute(stmt)
    tokens = list(result.scalars().all())

    sent_count = 0
    for token in tokens:
        success = await fcm_service.send_push_notification(
            fcm_token=token.token,
            title="Test Notification",
            body="Push notifications are working!",
            data={"type": "test_notification"},
        )
        if success:
            sent_count += 1
            logger.info(
                "Test push sent to device=%s provider=%s user=%s",
                str(token.device_id)[:8],
                token.provider,
                str(current_user.user_id)[:8],
            )

    return {"sent_to_devices": sent_count, "total_devices": len(tokens), "status": "success"}

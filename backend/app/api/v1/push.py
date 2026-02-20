import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.push import PushRegisterRequest, PushRegisterResponse
from app.services import device_service, push_service

router = APIRouter()


@router.post("/register", response_model=PushRegisterResponse)
async def register_push_token(
    body: PushRegisterRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PushRegisterResponse:
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

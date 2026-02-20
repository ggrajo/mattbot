import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_client_ip, get_current_user, require_step_up
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.common import MessageResponse
from app.schemas.device import DeviceListResponse, DeviceRegisterRequest, DeviceResponse
from app.services import device_service

router = APIRouter()


@router.get("", response_model=DeviceListResponse)
async def list_devices(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeviceListResponse:
    devices = await device_service.list_user_devices(db, current_user.user_id)
    items = [
        DeviceResponse(
            id=str(d.id),
            platform=d.platform,
            device_name=d.device_name,
            app_version=d.app_version,
            os_version=d.os_version,
            last_seen_at=d.last_seen_at,
            created_at=d.created_at,
            is_current=(d.id == current_user.device_id),
        )
        for d in devices
    ]
    return DeviceListResponse(items=items)


@router.post("/register-or-update", response_model=DeviceResponse)
async def register_or_update_device(
    body: DeviceRegisterRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeviceResponse:
    if body.device_id:
        device = await device_service.get_device(
            db, uuid.UUID(body.device_id), current_user.user_id
        )
        if device:
            device = await device_service.update_device(
                db,
                device,
                device_name=body.device_name,
                app_version=body.app_version,
                os_version=body.os_version,
            )
            return DeviceResponse(
                id=str(device.id),
                platform=device.platform,
                device_name=device.device_name,
                app_version=device.app_version,
                os_version=device.os_version,
                last_seen_at=device.last_seen_at,
                created_at=device.created_at,
                is_current=(device.id == current_user.device_id),
            )

    device = await device_service.create_or_get_device(
        db,
        owner_user_id=current_user.user_id,
        platform=body.platform,
        device_name=body.device_name,
        app_version=body.app_version,
        os_version=body.os_version,
    )
    return DeviceResponse(
        id=str(device.id),
        platform=device.platform,
        device_name=device.device_name,
        app_version=device.app_version,
        os_version=device.os_version,
        last_seen_at=device.last_seen_at,
        created_at=device.created_at,
        is_current=False,
    )


@router.post("/{device_id}/revoke", response_model=MessageResponse)
async def revoke_device(
    device_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    step_up: dict = Depends(require_step_up),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> MessageResponse:
    device = await device_service.get_device(
        db, uuid.UUID(device_id), current_user.user_id
    )
    if device is None:
        raise AppError("NOT_FOUND", "Device not found", 404)

    if device.revoked_at is not None:
        raise AppError("ALREADY_REVOKED", "Device already revoked", 400)

    await device_service.revoke_device(db, device, ip=ip)
    return MessageResponse(message="Device revoked successfully")

import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_client_ip, get_current_user, require_step_up
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.device import Device
from app.schemas.common import MessageResponse
from app.schemas.device import (
    DeviceListResponse,
    DeviceRegisterRequest,
    DeviceRememberRequest,
    DeviceResponse,
)
from app.services import device_service

router = APIRouter()


def _mask_ip(ip: str | None) -> str | None:
    """Partially mask an IP address for display."""
    if not ip:
        return None
    parts = ip.split(".")
    if len(parts) == 4:
        return f"{parts[0]}.{parts[1]}.***.*{parts[3][-1]}"
    return ip[:8] + "***"


def _device_to_response(d: Device, current_device_id: uuid.UUID | None) -> DeviceResponse:
    return DeviceResponse(
        id=str(d.id),
        platform=d.platform,
        device_name=d.device_name,
        app_version=d.app_version,
        os_version=d.os_version,
        last_ip=_mask_ip(d.last_ip),
        last_location=d.last_location,
        is_remembered=d.is_remembered,
        last_seen_at=d.last_seen_at,
        created_at=d.created_at,
        is_current=(d.id == current_device_id),
    )


@router.get("", response_model=DeviceListResponse)
async def list_devices(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> DeviceListResponse:
    allowed, _ = await check_rate_limit(
        f"account:devices:{current_user.user_id}",
        settings.RATE_LIMIT_AUTH_ACCOUNT_MAX,
        settings.RATE_LIMIT_AUTH_ACCOUNT_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)
    devices = await device_service.list_user_devices(db, current_user.user_id)
    items = [_device_to_response(d, current_user.device_id) for d in devices]
    return DeviceListResponse(items=items)


@router.post("/register-or-update", response_model=DeviceResponse)
async def register_or_update_device(
    body: DeviceRegisterRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> DeviceResponse:
    allowed, _ = await check_rate_limit(
        f"account:device_reg:{current_user.user_id}",
        settings.RATE_LIMIT_AUTH_ACCOUNT_MAX,
        settings.RATE_LIMIT_AUTH_ACCOUNT_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests. Please try again later.", 429)
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
                last_ip=ip,
            )
            return _device_to_response(device, current_user.device_id)

    device = await device_service.create_or_get_device(
        db,
        owner_user_id=current_user.user_id,
        platform=body.platform,
        device_name=body.device_name,
        app_version=body.app_version,
        os_version=body.os_version,
        last_ip=ip,
    )
    return _device_to_response(device, current_user.device_id)


@router.post("/{device_id}/remember", response_model=DeviceResponse)
async def remember_device(
    device_id: str,
    body: DeviceRememberRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeviceResponse:
    device = await device_service.get_device(db, uuid.UUID(device_id), current_user.user_id)
    if device is None:
        raise AppError("NOT_FOUND", "Device not found", 404)

    device.is_remembered = body.is_remembered
    await db.flush()
    await db.refresh(device)
    return _device_to_response(device, current_user.device_id)


@router.post("/{device_id}/revoke", response_model=MessageResponse)
async def revoke_device(
    device_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    step_up: dict = Depends(require_step_up),
    db: AsyncSession = Depends(get_db),
    ip: str = Depends(get_client_ip),
) -> MessageResponse:
    device = await device_service.get_device(db, uuid.UUID(device_id), current_user.user_id)
    if device is None:
        raise AppError("NOT_FOUND", "Device not found", 404)

    if device.revoked_at is not None:
        raise AppError("ALREADY_REVOKED", "Device already revoked", 400)

    await device_service.revoke_device(db, device, ip=ip)
    return MessageResponse(message="Device revoked successfully")

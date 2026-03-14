"""Contact profiles API: CRUD + category defaults + custom categories."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.clock import utcnow
from app.core.dependencies import CurrentUser, get_current_user
from app.core.encryption import decrypt_field, encrypt_field
from app.core.rate_limiter import check_rate_limit
from app.core.twilio_utils import extract_last4, hash_phone
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.contact_profile import ContactProfile
from app.models.user_settings import UserSettings
from app.schemas.contacts import (
    DEFAULT_CATEGORIES,
    CategoriesListResponse,
    CategoryDefaultsRequest,
    CategoryDefaultsResponse,
    CategoryItem,
    ContactCreateRequest,
    ContactListResponse,
    ContactResponse,
    ContactUpdateRequest,
    CustomCategoryCreateRequest,
)
from app.services.audit_service import log_event

router = APIRouter()

_DEFAULT_LABELS: dict[str, str] = {
    "business": "Business",
    "clients": "Clients",
    "colleagues": "Colleagues",
    "friends": "Friends",
    "family": "Family",
    "healthcare": "Healthcare",
    "vendors": "Vendors",
    "acquaintances": "Acquaintances",
    "other": "Other",
}


async def _get_valid_categories(db: AsyncSession, user_id: uuid.UUID) -> set[str]:
    """Return the full set of valid category slugs for a user."""
    row = await db.get(UserSettings, user_id)
    custom = row.custom_contact_categories if row else []
    return DEFAULT_CATEGORIES | {
        entry["slug"] for entry in custom if isinstance(entry, dict) and "slug" in entry
    }


async def _validate_contact_category(db: AsyncSession, user_id: uuid.UUID, category: str) -> None:
    valid = await _get_valid_categories(db, user_id)
    if category not in valid:
        raise AppError(
            code="UNKNOWN_CATEGORY",
            message=f"Unknown category '{category}'. Create it first or use one of the defaults.",
            status_code=409,
        )


def _to_response(c: ContactProfile) -> ContactResponse:
    greeting_instructions: str | None = None
    if c.ai_greeting_instructions_ciphertext is not None:
        try:
            greeting_instructions = decrypt_field(
                c.ai_greeting_instructions_ciphertext,
                c.ai_greeting_instructions_nonce,
                c.ai_greeting_instructions_key_version,
            ).decode("utf-8")
        except Exception:
            pass

    custom_instructions: str | None = None
    if c.ai_custom_instructions_ciphertext is not None:
        try:
            custom_instructions = decrypt_field(
                c.ai_custom_instructions_ciphertext,
                c.ai_custom_instructions_nonce,
                c.ai_custom_instructions_key_version,
            ).decode("utf-8")
        except Exception:
            pass

    return ContactResponse(
        **{
            "id": str(c.id),
            "phone_last4": c.phone_last4,
            "display_name": c.display_name,
            "company": c.company,
            "relationship": c.relationship,
            "email": c.email,
            "notes": c.notes,
            "category": c.category,
            "is_vip": c.is_vip,
            "is_blocked": c.is_blocked,
            "block_reason": c.block_reason,
            "ai_temperament_preset": c.ai_temperament_preset,
            "ai_greeting_template": c.ai_greeting_template,
            "ai_swearing_rule": c.ai_swearing_rule,
            "ai_max_call_length_seconds": c.ai_max_call_length_seconds,
            "ai_greeting_instructions": greeting_instructions,
            "ai_custom_instructions": custom_instructions,
            "has_custom_greeting": c.ai_greeting_instructions_ciphertext is not None,
            "has_custom_instructions": c.ai_custom_instructions_ciphertext is not None,
            "created_at": c.created_at,
            "updated_at": c.updated_at,
        }
    )


@router.get("", response_model=ContactListResponse)
async def list_contacts(
    category: str | None = Query(default=None),
    is_vip: bool | None = Query(default=None),
    is_blocked: bool | None = Query(default=None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContactListResponse:
    allowed, _ = await check_rate_limit(
        f"contacts:list:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_STANDARD_MAX,
        window_seconds=settings.RATE_LIMIT_API_STANDARD_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    filters = [
        ContactProfile.owner_user_id == current_user.user.id,
        ContactProfile.deleted_at.is_(None),
    ]

    if category is not None:
        filters.append(ContactProfile.category == category)

    if is_vip is not None:
        filters.append(ContactProfile.is_vip == is_vip)

    if is_blocked is not None:
        filters.append(ContactProfile.is_blocked == is_blocked)

    count_result = await db.execute(
        select(func.count()).select_from(ContactProfile).where(*filters)
    )
    total = count_result.scalar() or 0

    stmt = (
        select(ContactProfile)
        .where(*filters)
        .order_by(
            ContactProfile.display_name.asc().nulls_last(),
            ContactProfile.created_at.desc(),
        )
    )

    result = await db.execute(stmt)
    items = [_to_response(c) for c in result.scalars().all()]

    return ContactListResponse(items=items, total=total)


@router.post("", response_model=ContactResponse, status_code=201)
async def create_contact(
    body: ContactCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContactResponse:
    allowed, _ = await check_rate_limit(
        f"contacts:create:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    await _validate_contact_category(db, current_user.user.id, body.category)

    if getattr(body, 'is_vip', False) and getattr(body, 'is_blocked', False):
        body.is_blocked = False

    ph = hash_phone(body.phone_number)
    existing = (
        await db.execute(
            select(ContactProfile).where(
                ContactProfile.owner_user_id == current_user.user.id,
                ContactProfile.phone_hash == ph,
                ContactProfile.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()

    if existing is not None:
        raise AppError(
            code="CONTACT_DUPLICATE",
            message="This number already has a contact profile",
            status_code=409,
        )

    ct, nonce, kv = encrypt_field(body.phone_number.encode("utf-8"))

    contact = ContactProfile(
        **{
            "owner_user_id": current_user.user.id,
            "phone_ciphertext": ct,
            "phone_nonce": nonce,
            "phone_key_version": kv,
            "phone_hash": ph,
            "phone_last4": extract_last4(body.phone_number),
            "display_name": body.display_name,
            "company": body.company,
            "relationship": body.relationship,
            "email": body.email,
            "notes": body.notes,
            "category": body.category,
            "is_vip": body.is_vip,
            "is_blocked": body.is_blocked,
            "block_reason": body.block_reason,
            "ai_temperament_preset": body.ai_temperament_preset,
            "ai_greeting_template": body.ai_greeting_template,
            "ai_swearing_rule": body.ai_swearing_rule,
            "ai_max_call_length_seconds": body.ai_max_call_length_seconds,
        }
    )

    if body.ai_greeting_instructions:
        g_ct, g_n, g_kv = encrypt_field(body.ai_greeting_instructions.encode("utf-8"))
        contact.ai_greeting_instructions_ciphertext = g_ct
        contact.ai_greeting_instructions_nonce = g_n
        contact.ai_greeting_instructions_key_version = g_kv

    if body.ai_custom_instructions:
        i_ct, i_n, i_kv = encrypt_field(body.ai_custom_instructions.encode("utf-8"))
        contact.ai_custom_instructions_ciphertext = i_ct
        contact.ai_custom_instructions_nonce = i_n
        contact.ai_custom_instructions_key_version = i_kv

    db.add(contact)
    await log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="contact_created",
        actor_id=current_user.user.id,
        target_type="contact_profile",
        target_id=contact.id,
    )
    await db.flush()

    return _to_response(contact)


@router.get("/categories", response_model=CategoriesListResponse)
async def list_categories(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CategoriesListResponse:
    row = await db.get(UserSettings, current_user.user.id)
    custom = row.custom_contact_categories if row else []

    items = []
    for slug in sorted(DEFAULT_CATEGORIES):
        items.append(
            CategoryItem(
                slug=slug,
                label=_DEFAULT_LABELS.get(slug, slug.replace("_", " ").title()),
                is_default=True,
            )
        )

    for entry in custom:
        if not isinstance(entry, dict):
            continue
        if "slug" not in entry:
            continue
        items.append(
            CategoryItem(
                slug=entry["slug"],
                label=entry.get("label", entry["slug"].replace("_", " ").title()),
                is_default=False,
            )
        )

    return CategoriesListResponse(categories=items)


@router.post("/categories", response_model=CategoryItem, status_code=201)
async def create_custom_category(
    body: CustomCategoryCreateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CategoryItem:
    allowed, _ = await check_rate_limit(
        f"contacts:catcreate:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    if body.slug in DEFAULT_CATEGORIES:
        raise AppError(
            code="CATEGORY_IS_DEFAULT",
            message=f"'{body.slug}' is a built-in category and cannot be created",
            status_code=409,
        )

    row = await db.get(UserSettings, current_user.user.id)
    if row is None:
        raise AppError(
            code="SETTINGS_NOT_FOUND",
            message="User settings not found",
            status_code=404,
        )

    custom = list(row.custom_contact_categories or [])
    existing_slugs = {e["slug"] for e in custom if isinstance(e, dict) and "slug" in e}

    if body.slug in existing_slugs:
        raise AppError(
            code="CATEGORY_DUPLICATE",
            message=f"Custom category '{body.slug}' already exists",
            status_code=409,
        )

    if len(custom) >= 20:
        raise AppError(
            code="CATEGORY_LIMIT",
            message="Maximum of 20 custom categories allowed",
            status_code=400,
        )

    custom.append({"slug": body.slug, "label": body.label})
    row.custom_contact_categories = custom
    await db.flush()

    return CategoryItem(slug=body.slug, label=body.label, is_default=False)


@router.delete("/categories/{slug}")
async def delete_custom_category(
    slug: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    allowed, _ = await check_rate_limit(
        f"contacts:catdelete:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    if slug in DEFAULT_CATEGORIES:
        raise AppError(
            code="CATEGORY_IS_DEFAULT",
            message="Cannot delete a built-in category",
            status_code=400,
        )

    row = await db.get(UserSettings, current_user.user.id)
    if row is None:
        raise AppError(
            code="SETTINGS_NOT_FOUND",
            message="User settings not found",
            status_code=404,
        )

    custom = list(row.custom_contact_categories or [])
    new_custom = [e for e in custom if not (isinstance(e, dict) and e.get("slug") == slug)]

    if len(new_custom) == len(custom):
        raise AppError(
            code="CATEGORY_NOT_FOUND",
            message=f"Custom category '{slug}' not found",
            status_code=404,
        )

    row.custom_contact_categories = new_custom

    await db.execute(
        update(ContactProfile)
        .where(
            ContactProfile.owner_user_id == current_user.user.id,
            ContactProfile.category == slug,
            ContactProfile.deleted_at.is_(None),
        )
        .values(category="other")
    )

    cat_defaults = dict(row.contact_category_defaults or {})
    cat_defaults.pop(slug, None)
    row.contact_category_defaults = cat_defaults

    await db.flush()
    return {"deleted": True, "reassigned_to": "other"}


@router.get("/categories/defaults", response_model=CategoryDefaultsResponse)
async def get_category_defaults(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CategoryDefaultsResponse:
    row = await db.get(UserSettings, current_user.user.id)
    defaults = row.contact_category_defaults if row else {}
    return CategoryDefaultsResponse(defaults=defaults)


@router.put("/categories/defaults", response_model=CategoryDefaultsResponse)
async def update_category_defaults(
    body: CategoryDefaultsRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CategoryDefaultsResponse:
    allowed, _ = await check_rate_limit(
        f"contacts:catdef:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    row = await db.get(UserSettings, current_user.user.id)
    if row is None:
        raise AppError(
            code="SETTINGS_NOT_FOUND",
            message="User settings not found",
            status_code=404,
        )

    valid = await _get_valid_categories(db, current_user.user.id)
    for cat_key in body.defaults:
        if cat_key not in valid:
            raise AppError(
                code="UNKNOWN_CATEGORY",
                message=f"Unknown category '{cat_key}' in defaults",
                status_code=409,
            )

    row.contact_category_defaults = body.defaults
    await db.flush()
    return CategoryDefaultsResponse(defaults=row.contact_category_defaults)


@router.get("/{contact_id}", response_model=ContactResponse)
async def get_contact(
    contact_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContactResponse:
    contact = (
        await db.execute(
            select(ContactProfile).where(
                ContactProfile.id == contact_id,
                ContactProfile.owner_user_id == current_user.user.id,
                ContactProfile.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()

    if contact is None:
        raise AppError(
            code="CONTACT_NOT_FOUND",
            message="Contact not found",
            status_code=404,
        )

    return _to_response(contact)


@router.patch("/{contact_id}", response_model=ContactResponse)
async def update_contact(
    contact_id: uuid.UUID,
    body: ContactUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ContactResponse:
    allowed, _ = await check_rate_limit(
        f"contacts:update:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    contact = (
        await db.execute(
            select(ContactProfile).where(
                ContactProfile.id == contact_id,
                ContactProfile.owner_user_id == current_user.user.id,
                ContactProfile.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()

    if contact is None:
        raise AppError(
            code="CONTACT_NOT_FOUND",
            message="Contact not found",
            status_code=404,
        )

    if getattr(body, 'is_vip', False) and getattr(body, 'is_blocked', False):
        body.is_blocked = False

    data = body.model_dump(exclude_unset=True)

    if "category" in data and data["category"] is not None:
        await _validate_contact_category(db, current_user.user.id, data["category"])

    plain_fields = {
        "display_name",
        "company",
        "relationship",
        "email",
        "notes",
        "category",
        "is_vip",
        "is_blocked",
        "block_reason",
        "ai_temperament_preset",
        "ai_greeting_template",
        "ai_swearing_rule",
        "ai_max_call_length_seconds",
    }

    for field in plain_fields:
        if field not in data:
            continue
        if data[field] is None:
            continue
        setattr(contact, field, data[field])

    if data.get("ai_greeting_instructions"):
        g_ct, g_n, g_kv = encrypt_field(data["ai_greeting_instructions"].encode("utf-8"))
        contact.ai_greeting_instructions_ciphertext = g_ct
        contact.ai_greeting_instructions_nonce = g_n
        contact.ai_greeting_instructions_key_version = g_kv

    if data.get("ai_custom_instructions"):
        i_ct, i_n, i_kv = encrypt_field(data["ai_custom_instructions"].encode("utf-8"))
        contact.ai_custom_instructions_ciphertext = i_ct
        contact.ai_custom_instructions_nonce = i_n
        contact.ai_custom_instructions_key_version = i_kv

    if body.clear_ai_temperament:
        contact.ai_temperament_preset = None

    if body.clear_ai_greeting_template:
        contact.ai_greeting_template = None

    if body.clear_ai_greeting_instructions:
        contact.ai_greeting_instructions_ciphertext = None
        contact.ai_greeting_instructions_nonce = None
        contact.ai_greeting_instructions_key_version = None

    if body.clear_ai_swearing_rule:
        contact.ai_swearing_rule = None

    if body.clear_ai_max_call_length:
        contact.ai_max_call_length_seconds = None

    if body.clear_ai_custom_instructions:
        contact.ai_custom_instructions_ciphertext = None
        contact.ai_custom_instructions_nonce = None
        contact.ai_custom_instructions_key_version = None

    if data.get("is_blocked") is True:
        from app.models.block_entry import BlockEntry
        existing_block = (
            await db.execute(
                select(BlockEntry).where(
                    BlockEntry.owner_user_id == current_user.user.id,
                    BlockEntry.phone_hash == contact.phone_hash,
                )
            )
        ).scalar_one_or_none()
        if existing_block is None:
            block = BlockEntry(
                owner_user_id=current_user.user.id,
                phone_ciphertext=contact.phone_ciphertext,
                phone_nonce=contact.phone_nonce,
                phone_key_version=contact.phone_key_version,
                phone_hash=contact.phone_hash,
                phone_last4=contact.phone_last4,
                display_name=contact.display_name,
                reason=data.get("block_reason"),
            )
            db.add(block)
    elif data.get("is_blocked") is False:
        from app.models.block_entry import BlockEntry
        from sqlalchemy import delete as sql_delete
        await db.execute(
            sql_delete(BlockEntry).where(
                BlockEntry.owner_user_id == current_user.user.id,
                BlockEntry.phone_hash == contact.phone_hash,
            )
        )

    if data.get("is_vip") is True:
        from app.models.vip_entry import VipEntry
        existing_vip = (
            await db.execute(
                select(VipEntry).where(
                    VipEntry.owner_user_id == current_user.user.id,
                    VipEntry.phone_hash == contact.phone_hash,
                )
            )
        ).scalar_one_or_none()
        if existing_vip is None:
            vip = VipEntry(
                owner_user_id=current_user.user.id,
                phone_ciphertext=contact.phone_ciphertext,
                phone_nonce=contact.phone_nonce,
                phone_key_version=contact.phone_key_version,
                phone_hash=contact.phone_hash,
                phone_last4=contact.phone_last4,
                display_name=contact.display_name,
            )
            db.add(vip)
    elif data.get("is_vip") is False:
        from app.models.vip_entry import VipEntry
        from sqlalchemy import delete as sql_delete
        await db.execute(
            sql_delete(VipEntry).where(
                VipEntry.owner_user_id == current_user.user.id,
                VipEntry.phone_hash == contact.phone_hash,
            )
        )

    await db.flush()
    return _to_response(contact)


@router.delete("/{contact_id}")
async def delete_contact(
    contact_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    allowed, _ = await check_rate_limit(
        f"contacts:delete:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    contact = (
        await db.execute(
            select(ContactProfile).where(
                ContactProfile.id == contact_id,
                ContactProfile.owner_user_id == current_user.user.id,
                ContactProfile.deleted_at.is_(None),
            )
        )
    ).scalar_one_or_none()

    if contact is None:
        raise AppError(
            code="CONTACT_NOT_FOUND",
            message="Contact not found",
            status_code=404,
        )

    contact.deleted_at = utcnow()
    await log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="contact_deleted",
        actor_id=current_user.user.id,
        target_type="contact_profile",
        target_id=contact.id,
    )
    await db.flush()
    return {"deleted": True}

"""Call log and artifact API endpoints."""

from __future__ import annotations

import uuid
from datetime import UTC

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import (
    CurrentUser,
    get_current_user,
    get_current_user_from_query,
    require_step_up,
)
from app.core.encryption import decrypt_field, encrypt_field
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.schemas.calls import (
    ArtifactResponse,
    CallDetailResponse,
    CallEventResponse,
    CallListItem,
    CallListResponse,
    CallPatchRequest,
    LabelResponse,
    MarkBlockedRequest,
    MarkStatusResponse,
    SummaryRegenerateResponse,
    TranscriptResponse,
    TranscriptTurn,
)
from app.schemas.common import MessageResponse
from app.services import artifact_service, audit_service, call_service

router = APIRouter()


def _compute_artifact_status(call: object) -> str:
    """Compute aggregate artifact status for list display."""
    missing_s = getattr(call, "missing_summary", True)
    missing_t = getattr(call, "missing_transcript", True)
    missing_l = getattr(call, "missing_labels", True)

    if not missing_s and not missing_t and not missing_l:
        return "ready"

    if not missing_s:
        return "partial"

    status = getattr(call, "status", "")
    if status in ("completed", "partial", "failed"):
        if missing_s and missing_t and missing_l:
            return "processing"
        return "partial"

    return "processing"


@router.get("", response_model=CallListResponse)
async def list_calls(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    cursor: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=50),
    status: str | None = Query(default=None),
    source_type: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
    duration_min: int | None = Query(default=None, ge=0),
    duration_max: int | None = Query(default=None, ge=0),
    country_prefix: str | None = Query(default=None),
    has_recording: bool | None = Query(default=None),
    search: str | None = Query(default=None),
    label: str | None = Query(default=None),
    is_vip: bool | None = Query(default=None),
    is_blocked: bool | None = Query(default=None),
    sort_by: str | None = Query(default=None),
    sort_dir: str | None = Query(default=None),
) -> CallListResponse:
    from datetime import datetime

    parsed_from = None
    parsed_to = None
    if date_from:
        try:
            parsed_from = datetime.fromisoformat(date_from).replace(tzinfo=None)
        except ValueError as exc:
            raise AppError(
                code="INVALID_DATE", message="Invalid date_from format", status_code=422
            ) from exc

    if date_to:
        try:
            parsed_to = datetime.fromisoformat(date_to).replace(tzinfo=None)
        except ValueError as exc:
            raise AppError(
                code="INVALID_DATE", message="Invalid date_to format", status_code=422
            ) from exc

    calls, next_cursor, has_more = await call_service.list_calls_for_user(
        db,
        current_user.user.id,
        cursor=cursor,
        limit=limit,
        status=status,
        source_type=source_type,
        date_from=parsed_from,
        date_to=parsed_to,
        duration_min=duration_min,
        duration_max=duration_max,
        country_prefix=country_prefix,
        has_recording=has_recording,
        search=search,
        label=label,
        is_vip=is_vip,
        is_blocked=is_blocked,
        sort_by=sort_by,
        sort_dir=sort_dir,
    )

    caller_info = await _batch_caller_info(db, current_user.user.id, calls)
    call_extras = await _batch_call_extras(db, current_user.user.id, calls)

    items = [
        CallListItem(
            **{
                "id": str(c.id),
                "created_at": c.created_at,
                "direction": c.direction,
                "from_masked": c.from_masked,
                "to_masked": c.to_masked,
                "status": c.status,
                "duration_seconds": c.duration_seconds,
                "source_type": c.source_type,
                "missing_summary": c.missing_summary,
                "missing_transcript": c.missing_transcript,
                "missing_labels": c.missing_labels,
                "started_at": c.started_at,
                "artifact_status": _compute_artifact_status(c),
                "agent_id": str(c.agent_id) if c.agent_id else None,
                "voice_id": str(c.voice_id) if c.voice_id else None,
                "booked_calendar_event_id": c.booked_calendar_event_id,
                "booked_calendar_event_summary": c.booked_calendar_event_summary,
                **caller_info.get(c.caller_phone_hash, {}),
                **call_extras.get(str(c.id), {}),
            }
        )
        for c in calls
    ]

    return CallListResponse(items=items, next_cursor=next_cursor, has_more=has_more)


@router.get("/{call_id}", response_model=CallDetailResponse)
async def get_call_detail(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallDetailResponse:
    call = await call_service.get_call_for_user(db, current_user.user.id, call_id)
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    return await _build_call_detail(db, call, current_user.user.id)


@router.get("/{call_id}/caller-phone")
async def get_caller_phone(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Decrypt and return the full caller phone number for a call."""
    allowed, _ = await check_rate_limit(
        f"caller_phone:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    call = await call_service.get_call_for_user(db, current_user.user.id, call_id)
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    try:
        plaintext = decrypt_field(
            call.caller_phone_ciphertext,
            call.caller_phone_nonce,
            call.caller_phone_key_version,
        )
        phone = plaintext.decode("utf-8")
    except Exception as exc:
        raise AppError(
            code="DECRYPT_FAILED",
            message="Unable to decrypt caller phone number",
            status_code=500,
        ) from exc

    return {"phone": phone}


@router.get("/{call_id}/artifacts", response_model=ArtifactResponse)
async def get_call_artifacts(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ArtifactResponse:
    call = await call_service.get_call_for_user(db, current_user.user.id, call_id)
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    artifact = await artifact_service.get_artifact_for_user(db, current_user.user.id, call_id)

    if artifact is None:
        return ArtifactResponse(
            call_id=str(call_id),
            summary_status="not_available",
            labels_status="not_available",
            transcript_status="not_available",
        )

    summary_text = None
    if artifact.summary_status == "ready":
        summary_text = artifact_service.decrypt_summary(artifact)
        if summary_text and artifact_service._is_stale_summary(summary_text):
            refreshed = await artifact_service.refresh_stale_summary(db, artifact, call)
            if refreshed:
                summary_text = refreshed

    labels_list = []
    if artifact.labels_status == "ready" and artifact.labels_json:
        labels_list = [LabelResponse(**lbl) for lbl in artifact.labels_json]

    return ArtifactResponse(
        call_id=str(call_id),
        summary=summary_text,
        summary_status=artifact.summary_status,
        labels=labels_list,
        labels_status=artifact.labels_status,
        transcript_status=artifact.transcript_status,
        structured_extraction=artifact.structured_extraction,
    )


@router.get("/{call_id}/transcript", response_model=TranscriptResponse)
async def get_call_transcript(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TranscriptResponse:
    allowed, _ = await check_rate_limit(
        f"transcript:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    call = await call_service.get_call_for_user(db, current_user.user.id, call_id)
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    artifact = await artifact_service.get_artifact_for_user(db, current_user.user.id, call_id)

    if artifact is None or not artifact.transcript_provider_ref:
        return TranscriptResponse(call_id=str(call_id), status="not_available")

    if artifact.transcript_status != "ready":
        return TranscriptResponse(call_id=str(call_id), status=artifact.transcript_status)

    transcript_data = await artifact_service.proxy_transcript(artifact.transcript_provider_ref)

    if transcript_data is None:
        return TranscriptResponse(call_id=str(call_id), status="failed")

    turns = [TranscriptTurn(**turn) for turn in transcript_data.get("turns", [])]

    return TranscriptResponse(
        call_id=str(call_id),
        conversation_id=artifact.transcript_provider_ref,
        turns=turns,
        turn_count=len(turns),
        status="ready",
    )


@router.post("/{call_id}/transcript/retry")
async def retry_transcript(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    call = await call_service.get_call_for_user(db, current_user.user.id, call_id)
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    artifact = await artifact_service.get_artifact_for_user(db, current_user.user.id, call_id)

    if artifact is None:
        raise AppError(
            code="NO_ARTIFACT",
            message="No artifact record for this call",
            status_code=404,
        )

    if artifact.transcript_status not in ("failed", "not_available"):
        return {
            "status": artifact.transcript_status,
            "message": "Transcript is not in a retryable state",
        }

    artifact.transcript_status = "processing"
    if artifact.summary_status == "failed":
        artifact.summary_status = "processing"
    if artifact.labels_status == "failed":
        artifact.labels_status = "processing"

    await db.commit()
    return {"status": "processing", "message": "Transcript retry queued"}


@router.patch("/{call_id}", response_model=CallDetailResponse)
async def patch_call(
    call_id: uuid.UUID,
    body: CallPatchRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> CallDetailResponse:
    allowed, _ = await check_rate_limit(
        f"patch_call:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    call = await call_service.get_call_for_user(db, current_user.user.id, call_id)
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    artifact = await artifact_service.get_artifact_for_user(db, current_user.user.id, call_id)

    labels_changed = False

    if body.urgency_level is not None or body.spam_label is not None:
        if artifact is None:
            artifact = await artifact_service.get_or_create_artifact(
                db, call_id=call_id, user_id=current_user.user.id
            )

        existing_labels = list(artifact.labels_json or [])
        original_labels = list(existing_labels)

        if body.urgency_level is not None:
            existing_labels = [lbl for lbl in existing_labels if lbl.get("label_name") != "urgency"]
            existing_labels.append(
                {
                    "label_name": "urgency",
                    "reason_text": f"User set urgency to {body.urgency_level}",
                    "evidence_snippets": [],
                    "confidence": 1.0,
                    "produced_by": "user_override",
                    "value": body.urgency_level,
                    "user_override": True,
                }
            )
            labels_changed = True

        if body.spam_label is not None:
            existing_labels = [
                lbl
                for lbl in existing_labels
                if lbl.get("label_name") not in ("spam", "sales", "spam_override")
            ]
            existing_labels.append(
                {
                    "label_name": "spam_override",
                    "reason_text": f"User classified call as {body.spam_label}",
                    "evidence_snippets": [],
                    "confidence": 1.0,
                    "produced_by": "user_override",
                    "value": body.spam_label,
                    "user_override": True,
                }
            )
            labels_changed = True

        artifact.labels_json = existing_labels
        if artifact.labels_status in ("pending", "not_available"):
            artifact.labels_status = "ready"
            call.missing_labels = False

        if labels_changed:
            await audit_service.log_event(
                db,
                owner_user_id=current_user.user.id,
                event_type="CALL_LABELS_UPDATED",
                target_type="call",
                target_id=call_id,
                details={
                    "original_labels": original_labels,
                    "updated_labels": existing_labels,
                },
            )

    notes_changed = False
    if body.notes is not None:
        if artifact is None:
            artifact = await artifact_service.get_or_create_artifact(
                db, call_id=call_id, user_id=current_user.user.id
            )

        ct, nonce, kv = encrypt_field(body.notes.encode("utf-8"))
        artifact.notes_ciphertext = ct
        artifact.notes_nonce = nonce
        artifact.notes_key_version = kv
        notes_changed = True

        await audit_service.log_event(
            db,
            owner_user_id=current_user.user.id,
            event_type="CALL_NOTES_UPDATED",
            target_type="call",
            target_id=call_id,
        )

    if labels_changed or notes_changed:
        await db.commit()
        await db.refresh(call)
        if artifact:
            await db.refresh(artifact)

    return await _build_call_detail(db, call, current_user.user.id)


@router.post(
    "/{call_id}/summary/regenerate",
    response_model=SummaryRegenerateResponse,
    status_code=202,
)
async def regenerate_summary(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> SummaryRegenerateResponse:
    allowed, _ = await check_rate_limit(
        f"regen_summary:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    call = await call_service.get_call_for_user(db, current_user.user.id, call_id)
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    artifact = await artifact_service.get_artifact_for_user(db, current_user.user.id, call_id)

    if artifact is None:
        raise AppError(
            code="NO_ARTIFACT",
            message="No artifact record for this call",
            status_code=404,
        )

    if artifact.transcript_status not in ("ready", "partial"):
        raise AppError(
            code="TRANSCRIPT_NOT_READY",
            message="Transcript must be ready or partial before regenerating summary",
            status_code=409,
        )

    artifact.summary_status = "pending"
    call.missing_summary = True

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="SUMMARY_REGENERATE_REQUESTED",
        target_type="call",
        target_id=call_id,
    )

    await db.commit()

    return SummaryRegenerateResponse(
        call_id=str(call_id),
        summary_status="pending",
        message="Summary regeneration queued",
    )


@router.get("/{call_id}/recording")
async def get_call_recording(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user_from_query),
    db: AsyncSession = Depends(get_db),
) -> Response:
    from fastapi.responses import Response as FastAPIResponse

    allowed, _ = await check_rate_limit(
        f"recording:{current_user.user.id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError(code="RATE_LIMITED", message="Too many requests", status_code=429)

    call = await call_service.get_call_for_user(db, current_user.user.id, call_id)
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    artifact = await artifact_service.get_artifact_for_user(db, current_user.user.id, call_id)

    if artifact is None or not artifact.transcript_provider_ref:
        raise AppError(
            code="RECORDING_NOT_AVAILABLE",
            message="Recording not available for this call",
            status_code=404,
        )

    from app.services.elevenlabs_agent_service import fetch_conversation_audio

    audio_bytes = await fetch_conversation_audio(artifact.transcript_provider_ref)
    if audio_bytes is None:
        raise AppError(
            code="RECORDING_NOT_AVAILABLE",
            message="Recording not available from provider",
            status_code=404,
        )

    return FastAPIResponse(
        content=audio_bytes,
        media_type="audio/mpeg",
        headers={"Content-Disposition": f'inline; filename="call_{call_id}.mp3"'},
    )


async def _batch_caller_info(db: AsyncSession, user_id: uuid.UUID, calls: list) -> dict[str, dict]:
    """Batch-fetch VIP/block status and memory-based display names for a list
    of calls. Returns a dict keyed by caller_phone_hash with fields suitable
    for unpacking into CallListItem."""
    from app.core.encryption import decrypt_field
    from app.models.block_entry import BlockEntry
    from app.models.call_memory_item import CallMemoryItem
    from app.models.vip_entry import VipEntry

    hashes = {c.caller_phone_hash for c in calls if c.caller_phone_hash}
    if not hashes:
        return {}

    vip_stmt = select(VipEntry.phone_hash, VipEntry.display_name, VipEntry.relationship).where(
        VipEntry.owner_user_id == user_id, VipEntry.phone_hash.in_(hashes)
    )
    vip_rows = (await db.execute(vip_stmt)).all()
    vip_map: dict = {}
    for ph, name, rel in vip_rows:
        vip_map[ph] = {"display_name": name, "relationship": rel}

    block_stmt = select(BlockEntry.phone_hash).where(
        BlockEntry.owner_user_id == user_id, BlockEntry.phone_hash.in_(hashes)
    )
    block_rows = (await db.execute(block_stmt)).all()
    block_set = {row[0] for row in block_rows}

    mem_stmt = select(CallMemoryItem).where(
        CallMemoryItem.owner_user_id == user_id,
        CallMemoryItem.caller_phone_hash.in_(hashes),
        CallMemoryItem.memory_type.in_(["caller_display_name", "relationship_tag"]),
        CallMemoryItem.deleted_at.is_(None),
    )
    mem_rows = (await db.execute(mem_stmt)).scalars().all()
    mem_map: dict = {}
    for item in mem_rows:
        try:
            val = decrypt_field(
                item.value_ciphertext, item.value_nonce, item.value_key_version
            ).decode("utf-8")
        except Exception:
            continue
        ph = item.caller_phone_hash
        if ph not in mem_map:
            mem_map[ph] = {}
        if item.memory_type == "caller_display_name":
            mem_map[ph]["display_name"] = val
        elif item.memory_type == "relationship_tag":
            mem_map[ph]["relationship"] = val

    result: dict = {}
    for ph in hashes:
        vip_data = vip_map.get(ph)
        mem_data = mem_map.get(ph, {})
        entry: dict = {
            "is_vip": ph in vip_map,
            "is_blocked": ph in block_set,
            "caller_display_name": None,
            "caller_relationship": None,
        }
        if vip_data:
            entry["caller_display_name"] = vip_data.get("display_name")
            entry["caller_relationship"] = vip_data.get("relationship")
        if not entry["caller_display_name"] and mem_data.get("display_name"):
            entry["caller_display_name"] = mem_data["display_name"]
        if not entry["caller_relationship"] and mem_data.get("relationship"):
            entry["caller_relationship"] = mem_data["relationship"]
        result[ph] = entry

    return result


async def _batch_call_extras(
    db: AsyncSession, user_id: uuid.UUID, calls: list
) -> dict[str, dict]:
    """Batch-fetch notes, labels, and reminder existence for call list items."""
    from app.models.call_artifact import CallArtifact
    from app.models.reminder import Reminder

    call_ids = [c.id for c in calls]
    if not call_ids:
        return {}

    art_stmt = select(
        CallArtifact.call_id,
        CallArtifact.notes_ciphertext,
        CallArtifact.labels_json,
    ).where(CallArtifact.call_id.in_(call_ids))
    art_rows = (await db.execute(art_stmt)).all()

    art_map: dict[str, dict] = {}
    for call_id, notes_ct, labels_json in art_rows:
        cid = str(call_id)
        has_notes = notes_ct is not None and len(notes_ct) > 0
        label_names: list[str] = []
        if labels_json and isinstance(labels_json, list):
            for lbl in labels_json:
                if isinstance(lbl, dict) and "label_name" in lbl:
                    label_names.append(lbl["label_name"])
                elif isinstance(lbl, str):
                    label_names.append(lbl)
        art_map[cid] = {"has_notes": has_notes, "labels": label_names}

    rem_stmt = select(Reminder.call_id).where(
        Reminder.owner_user_id == user_id,
        Reminder.call_id.in_(call_ids),
        Reminder.status.in_(["scheduled", "triggered"]),
    ).distinct()
    rem_rows = (await db.execute(rem_stmt)).all()
    rem_set = {str(row[0]) for row in rem_rows}

    result: dict[str, dict] = {}
    for c in calls:
        cid = str(c.id)
        art = art_map.get(cid, {})
        result[cid] = {
            "has_notes": art.get("has_notes", False),
            "labels": art.get("labels", []),
            "has_reminder": cid in rem_set,
        }
    return result


async def _build_call_detail(
    db: AsyncSession, call: object, user_id: uuid.UUID
) -> CallDetailResponse:
    """Build a full CallDetailResponse from a Call row (shared by GET and PATCH)."""
    from app.models.block_entry import BlockEntry
    from app.models.vip_entry import VipEntry

    events = await call_service.get_call_events(db, call.id, user_id)

    event_items = [
        CallEventResponse(
            id=str(e.id),
            event_type=e.event_type,
            provider_status=e.provider_status,
            event_at=e.event_at,
        )
        for e in events
    ]

    artifact = await artifact_service.get_artifact_for_user(db, user_id, call.id)

    summary_text = None
    summary_status = None
    labels_list = None
    labels_status = None
    transcript_status = None
    notes_text = None

    if artifact:
        summary_status = artifact.summary_status
        labels_status = artifact.labels_status
        transcript_status = artifact.transcript_status

        if artifact.summary_status == "ready":
            summary_text = artifact_service.decrypt_summary(artifact)
            if summary_text and artifact_service._is_stale_summary(summary_text):
                refreshed = await artifact_service.refresh_stale_summary(db, artifact, call)
                if refreshed:
                    summary_text = refreshed

        if artifact.labels_status == "ready" and artifact.labels_json:
            labels_list = [LabelResponse(**lbl) for lbl in artifact.labels_json]

        notes_text = artifact_service.decrypt_notes(artifact)

    recording_available = bool(
        artifact
        and artifact.transcript_provider_ref
        and artifact.transcript_status in ("ready", "partial")
    )

    caller_hash = getattr(call, "caller_phone_hash", None)
    is_vip = False
    is_blocked = False
    caller_display_name = None
    caller_relationship = None
    caller_category = None
    caller_contact_id = None
    if caller_hash:
        vip_row = (
            await db.execute(
                select(VipEntry).where(
                    VipEntry.owner_user_id == user_id,
                    VipEntry.phone_hash == caller_hash,
                )
            )
        ).scalar_one_or_none()

        is_vip = vip_row is not None
        if vip_row:
            caller_display_name = vip_row.display_name or None
            caller_relationship = vip_row.relationship or None

        block_row = (
            await db.execute(
                select(BlockEntry).where(
                    BlockEntry.owner_user_id == user_id,
                    BlockEntry.phone_hash == caller_hash,
                )
            )
        ).scalar_one_or_none()

        is_blocked = block_row is not None
        if block_row and not caller_display_name:
            caller_display_name = block_row.display_name or None

        if not caller_display_name:
            mem_name, mem_rel = await _get_caller_memory_hints(db, user_id, caller_hash)
            if mem_name:
                caller_display_name = mem_name
            if mem_rel and not caller_relationship:
                caller_relationship = mem_rel

        from app.models.contact_profile import ContactProfile as CP
        contact_row = (
            await db.execute(
                select(CP).where(
                    CP.owner_user_id == user_id,
                    CP.phone_hash == caller_hash,
                    CP.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()
        if contact_row:
            caller_contact_id = str(contact_row.id)
            if contact_row.display_name and not caller_display_name:
                caller_display_name = contact_row.display_name
            if contact_row.category and contact_row.category != "other":
                caller_category = contact_row.category

    booking_details: dict = {}
    if call.booked_calendar_event_id:
        from sqlalchemy import type_coerce
        from sqlalchemy.dialects.postgresql import JSONB
        from app.models.audit_event import AuditEvent

        audit_row = (
            await db.execute(
                select(AuditEvent)
                .where(
                    AuditEvent.owner_user_id == user_id,
                    AuditEvent.event_type == "calendar.appointment_booked",
                    type_coerce(AuditEvent.details, JSONB)["call_id"].as_string() == str(call.id),
                )
                .order_by(AuditEvent.created_at.desc())
                .limit(1)
            )
        ).scalar_one_or_none()
        if audit_row and audit_row.details:
            d = audit_row.details
            booking_details = {
                "booked_appointment_date": d.get("date"),
                "booked_appointment_time": d.get("time"),
                "booked_appointment_duration_minutes": d.get("duration_minutes"),
                "booked_appointment_caller_name": d.get("caller_name"),
                "booked_appointment_reason": d.get("reason"),
            }

    return CallDetailResponse(
        **{
            "id": str(call.id),
            "direction": call.direction,
            "source_type": call.source_type,
            "from_masked": call.from_masked,
            "to_masked": call.to_masked,
            "status": call.status,
            "started_at": call.started_at,
            "ended_at": call.ended_at,
            "duration_seconds": call.duration_seconds,
            "forwarding_detected": call.forwarding_detected,
            "missing_summary": call.missing_summary,
            "missing_transcript": call.missing_transcript,
            "missing_labels": call.missing_labels,
            "events": event_items,
            "created_at": call.created_at,
            "notes": notes_text,
            "summary": summary_text,
            "summary_status": summary_status,
            "labels": labels_list,
            "labels_status": labels_status,
            "transcript_status": transcript_status,
            "recording_available": recording_available,
            "is_vip": is_vip,
            "is_blocked": is_blocked,
            "caller_display_name": caller_display_name,
            "caller_relationship": caller_relationship,
            "caller_category": caller_category,
            "caller_contact_id": caller_contact_id,
            "agent_id": str(call.agent_id) if call.agent_id else None,
            "voice_id": str(call.voice_id) if call.voice_id else None,
            "booked_calendar_event_id": call.booked_calendar_event_id,
            "booked_calendar_event_summary": call.booked_calendar_event_summary,
            **booking_details,
        }
    )


async def _get_call_owned(db: AsyncSession, user_id: uuid.UUID, call_id: uuid.UUID) -> object:
    call = await call_service.get_call_for_user(db, user_id, call_id)
    if call is None:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)
    return call


async def _get_caller_memory_hints(
    db: AsyncSession, user_id: uuid.UUID, phone_hash: str | None
) -> tuple[str, str]:
    """Return (display_name, relationship) from memory items for a caller."""
    if not phone_hash:
        return ("", "")
    from app.core.encryption import decrypt_field
    from app.models.call_memory_item import CallMemoryItem

    stmt = select(CallMemoryItem).where(
        CallMemoryItem.owner_user_id == user_id,
        CallMemoryItem.caller_phone_hash == phone_hash,
        CallMemoryItem.memory_type.in_(["caller_display_name", "relationship_tag"]),
        CallMemoryItem.deleted_at.is_(None),
    )

    result = await db.execute(stmt)
    name = ""
    rel = ""
    for item in result.scalars().all():
        try:
            val = decrypt_field(
                item.value_ciphertext,
                item.value_nonce,
                item.value_key_version,
            ).decode("utf-8")
        except Exception:
            continue
        if item.memory_type == "caller_display_name":
            name = val
        elif item.memory_type == "relationship_tag":
            rel = val
    return (name, rel)


@router.post("/{call_id}/mark-vip", response_model=MarkStatusResponse, status_code=201)
async def mark_call_vip(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MarkStatusResponse:
    from app.models.vip_entry import VipEntry
    from app.models.block_entry import BlockEntry
    from app.models.spam_entry import SpamEntry
    from app.models.contact_profile import ContactProfile
    from sqlalchemy import delete as sql_delete, update as sql_update

    call = await _get_call_owned(db, current_user.user.id, call_id)
    phone_hash = call.caller_phone_hash
    uid = current_user.user.id

    existing = (
        await db.execute(
            select(VipEntry).where(
                VipEntry.owner_user_id == uid,
                VipEntry.phone_hash == phone_hash,
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        memory_name, memory_rel = await _get_caller_memory_hints(
            db, uid, phone_hash
        )
        entry = VipEntry(
            owner_user_id=uid,
            phone_ciphertext=call.caller_phone_ciphertext,
            phone_nonce=call.caller_phone_nonce,
            phone_key_version=call.caller_phone_key_version,
            phone_hash=phone_hash,
            phone_last4=call.caller_phone_last4,
            display_name=memory_name or None,
            relationship=memory_rel or None,
        )
        db.add(entry)
        await audit_service.log_event(
            db,
            owner_user_id=uid,
            event_type="vip_added",
            actor_id=uid,
            target_type="vip_entry",
            target_id=entry.id,
        )

    await db.execute(
        sql_delete(BlockEntry).where(BlockEntry.owner_user_id == uid, BlockEntry.phone_hash == phone_hash)
    )
    await db.execute(
        sql_delete(SpamEntry).where(SpamEntry.owner_user_id == uid, SpamEntry.phone_hash == phone_hash)
    )
    await db.execute(
        sql_update(ContactProfile)
        .where(ContactProfile.owner_user_id == uid, ContactProfile.phone_hash == phone_hash)
        .values(is_vip=True, is_blocked=False, block_reason=None)
    )
    await db.commit()

    return MarkStatusResponse(is_vip=True, is_blocked=False)


@router.delete("/{call_id}/mark-vip", response_model=MarkStatusResponse)
async def unmark_call_vip(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MarkStatusResponse:
    from app.models.vip_entry import VipEntry
    from app.models.contact_profile import ContactProfile
    from sqlalchemy import update as sql_update

    call = await _get_call_owned(db, current_user.user.id, call_id)
    phone_hash = call.caller_phone_hash
    uid = current_user.user.id

    existing = (
        await db.execute(
            select(VipEntry).where(
                VipEntry.owner_user_id == uid,
                VipEntry.phone_hash == phone_hash,
            )
        )
    ).scalar_one_or_none()

    if existing is not None:
        await audit_service.log_event(
            db,
            owner_user_id=uid,
            event_type="vip_removed",
            actor_id=uid,
            target_type="vip_entry",
            target_id=existing.id,
        )
        await db.delete(existing)

    await db.execute(
        sql_update(ContactProfile)
        .where(ContactProfile.owner_user_id == uid, ContactProfile.phone_hash == phone_hash)
        .values(is_vip=False)
    )
    await db.commit()

    return MarkStatusResponse(is_vip=False, is_blocked=False)


@router.post("/{call_id}/mark-blocked", response_model=MarkStatusResponse, status_code=201)
async def mark_call_blocked(
    call_id: uuid.UUID,
    body: MarkBlockedRequest | None = None,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MarkStatusResponse:
    from app.models.block_entry import BlockEntry
    from app.models.vip_entry import VipEntry
    from app.models.spam_entry import SpamEntry
    from app.models.contact_profile import ContactProfile
    from sqlalchemy import delete as sql_delete, update as sql_update

    call = await _get_call_owned(db, current_user.user.id, call_id)
    phone_hash = call.caller_phone_hash
    uid = current_user.user.id
    reason = body.reason if body else None

    existing = (
        await db.execute(
            select(BlockEntry).where(
                BlockEntry.owner_user_id == uid,
                BlockEntry.phone_hash == phone_hash,
            )
        )
    ).scalar_one_or_none()

    if existing is None:
        memory_name, memory_rel = await _get_caller_memory_hints(
            db, uid, phone_hash
        )
        entry = BlockEntry(
            owner_user_id=uid,
            phone_ciphertext=call.caller_phone_ciphertext,
            phone_nonce=call.caller_phone_nonce,
            phone_key_version=call.caller_phone_key_version,
            phone_hash=phone_hash,
            phone_last4=call.caller_phone_last4,
            reason=reason,
            display_name=memory_name or None,
            relationship=memory_rel or None,
        )
        db.add(entry)
        await audit_service.log_event(
            db,
            owner_user_id=uid,
            event_type="block_added",
            actor_id=uid,
            target_type="block_entry",
            target_id=entry.id,
        )

    await db.execute(
        sql_delete(VipEntry).where(VipEntry.owner_user_id == uid, VipEntry.phone_hash == phone_hash)
    )
    if reason != "spam":
        await db.execute(
            sql_delete(SpamEntry).where(SpamEntry.owner_user_id == uid, SpamEntry.phone_hash == phone_hash)
        )
    await db.execute(
        sql_update(ContactProfile)
        .where(ContactProfile.owner_user_id == uid, ContactProfile.phone_hash == phone_hash)
        .values(is_blocked=True, block_reason=reason, is_vip=False)
    )
    await db.commit()

    return MarkStatusResponse(is_vip=False, is_blocked=True)


@router.delete("/{call_id}/mark-blocked", response_model=MarkStatusResponse)
async def unmark_call_blocked(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MarkStatusResponse:
    from app.models.block_entry import BlockEntry
    from app.models.spam_entry import SpamEntry
    from app.models.contact_profile import ContactProfile
    from sqlalchemy import delete as sql_delete, update as sql_update

    call = await _get_call_owned(db, current_user.user.id, call_id)
    phone_hash = call.caller_phone_hash
    uid = current_user.user.id

    existing = (
        await db.execute(
            select(BlockEntry).where(
                BlockEntry.owner_user_id == uid,
                BlockEntry.phone_hash == phone_hash,
            )
        )
    ).scalar_one_or_none()

    if existing is not None:
        await audit_service.log_event(
            db,
            owner_user_id=uid,
            event_type="block_removed",
            actor_id=uid,
            target_type="block_entry",
            target_id=existing.id,
        )
        await db.delete(existing)

    await db.execute(
        sql_delete(SpamEntry).where(SpamEntry.owner_user_id == uid, SpamEntry.phone_hash == phone_hash)
    )
    await db.execute(
        sql_update(ContactProfile)
        .where(ContactProfile.owner_user_id == uid, ContactProfile.phone_hash == phone_hash)
        .values(is_blocked=False, block_reason=None)
    )
    await db.commit()

    return MarkStatusResponse(is_vip=False, is_blocked=False)


@router.delete("/{call_id}", response_model=MessageResponse)
async def delete_call(
    call_id: uuid.UUID,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    deleted = await call_service.soft_delete_call(db, current_user.user.id, call_id)
    if not deleted:
        raise AppError(code="CALL_NOT_FOUND", message="Call not found", status_code=404)

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="CALL_DELETED",
        target_type="call",
        target_id=call_id,
    )
    await db.commit()
    return MessageResponse(message="Call deleted successfully")


@router.delete("/delete-all", response_model=MessageResponse)
async def delete_all_calls(
    current_user: CurrentUser = Depends(get_current_user),
    step_up: None = Depends(require_step_up),
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    count = await call_service.soft_delete_all_calls(db, current_user.user.id)

    await audit_service.log_event(
        db,
        owner_user_id=current_user.user.id,
        event_type="ALL_CALLS_DELETED",
        details={"count": count},
    )
    await db.commit()
    return MessageResponse(message=f"Deleted {count} call(s) successfully")

"""Knowledge-base document management endpoints."""

from __future__ import annotations

import logging
import uuid

from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.dependencies import CurrentUser, get_current_user
from app.core.rate_limiter import check_rate_limit
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.knowledge_base_doc import KnowledgeBaseDoc
from app.schemas.knowledge_base import (
    KBCreateTextRequest,
    KBCreateUrlRequest,
    KBDeleteResponse,
    KBDocListResponse,
    KBDocResponse,
)
from app.services import agent_service, elevenlabs_agent_service

logger = logging.getLogger(__name__)

router = APIRouter()

MAX_TEXT_LENGTH = 500_000
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB


def _row_to_response(row: KnowledgeBaseDoc) -> KBDocResponse:
    return KBDocResponse(
        id=str(row.id),
        name=row.name,
        source_type=row.source_type,
        source_ref=row.source_ref,
        created_at=row.created_at,
    )


async def _resync_agent(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Re-sync the ElevenLabs agent so it picks up the latest KB docs."""
    try:
        agent = await agent_service.get_or_create_default_agent(db, user_id=user_id)
        await agent_service.ensure_elevenlabs_agent(db, agent, user_id)
    except Exception:
        logger.exception("KB resync agent failed for user %s", str(user_id)[:8])


@router.get("", response_model=KBDocListResponse)
async def list_kb_docs(
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KBDocListResponse:
    rows = (
        await db.execute(
            select(KnowledgeBaseDoc)
            .where(KnowledgeBaseDoc.owner_user_id == current_user.user_id)
            .order_by(KnowledgeBaseDoc.created_at.desc())
        )
    ).scalars().all()
    return KBDocListResponse(
        items=[_row_to_response(r) for r in rows],
        total=len(rows),
    )


@router.post("/text", response_model=KBDocResponse, status_code=201)
async def create_from_text(
    body: KBCreateTextRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KBDocResponse:
    allowed, _ = await check_rate_limit(
        f"kb:create:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests", 429)

    if not body.name.strip():
        raise AppError("INVALID_INPUT", "Name is required", 400)
    if not body.text.strip():
        raise AppError("INVALID_INPUT", "Text content is required", 400)
    if len(body.text) > MAX_TEXT_LENGTH:
        raise AppError("INVALID_INPUT", f"Text must be under {MAX_TEXT_LENGTH} characters", 400)

    try:
        el_doc_id = await elevenlabs_agent_service.create_kb_doc_from_text(
            body.name.strip(), body.text
        )
    except Exception as exc:
        logger.exception("ElevenLabs KB text creation failed")
        raise AppError("KB_CREATE_FAILED", "Failed to create knowledge base document", 502) from exc

    row = KnowledgeBaseDoc(
        owner_user_id=current_user.user_id,
        el_document_id=el_doc_id,
        name=body.name.strip(),
        source_type="text",
    )
    db.add(row)
    await db.flush()
    await db.refresh(row)

    await _resync_agent(db, current_user.user_id)
    await db.commit()
    return _row_to_response(row)


@router.post("/url", response_model=KBDocResponse, status_code=201)
async def create_from_url(
    body: KBCreateUrlRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KBDocResponse:
    allowed, _ = await check_rate_limit(
        f"kb:create:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests", 429)

    if not body.name.strip():
        raise AppError("INVALID_INPUT", "Name is required", 400)

    url_str = str(body.url)

    try:
        el_doc_id = await elevenlabs_agent_service.create_kb_doc_from_url(
            body.name.strip(), url_str
        )
    except Exception as exc:
        logger.exception("ElevenLabs KB url creation failed")
        raise AppError("KB_CREATE_FAILED", "Failed to create knowledge base document from URL", 502) from exc

    row = KnowledgeBaseDoc(
        owner_user_id=current_user.user_id,
        el_document_id=el_doc_id,
        name=body.name.strip(),
        source_type="url",
        source_ref=url_str,
    )
    db.add(row)
    await db.flush()
    await db.refresh(row)

    await _resync_agent(db, current_user.user_id)
    await db.commit()
    return _row_to_response(row)


@router.post("/file", response_model=KBDocResponse, status_code=201)
async def create_from_file(
    file: UploadFile = File(...),
    name: str = Form(...),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KBDocResponse:
    allowed, _ = await check_rate_limit(
        f"kb:create:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests", 429)

    if not name.strip():
        raise AppError("INVALID_INPUT", "Name is required", 400)

    file_bytes = await file.read()
    if len(file_bytes) > MAX_FILE_SIZE:
        raise AppError("FILE_TOO_LARGE", "File must be under 25 MB", 400)
    if not file_bytes:
        raise AppError("INVALID_INPUT", "File is empty", 400)

    filename = file.filename or "upload"

    try:
        el_doc_id = await elevenlabs_agent_service.create_kb_doc_from_file(
            name.strip(), file_bytes, filename
        )
    except Exception as exc:
        logger.exception("ElevenLabs KB file creation failed")
        raise AppError("KB_CREATE_FAILED", "Failed to upload knowledge base document", 502) from exc

    row = KnowledgeBaseDoc(
        owner_user_id=current_user.user_id,
        el_document_id=el_doc_id,
        name=name.strip(),
        source_type="file",
        source_ref=filename,
    )
    db.add(row)
    await db.flush()
    await db.refresh(row)

    await _resync_agent(db, current_user.user_id)
    await db.commit()
    return _row_to_response(row)


@router.delete("/{doc_id}", response_model=KBDeleteResponse)
async def delete_kb_doc(
    doc_id: str,
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> KBDeleteResponse:
    allowed, _ = await check_rate_limit(
        f"kb:delete:{current_user.user_id}",
        max_requests=settings.RATE_LIMIT_API_WRITE_MAX,
        window_seconds=settings.RATE_LIMIT_API_WRITE_WINDOW,
    )
    if not allowed:
        raise AppError("RATE_LIMITED", "Too many requests", 429)

    try:
        doc_uuid = uuid.UUID(doc_id)
    except ValueError as err:
        raise AppError("INVALID_ID", "Invalid document ID", 400) from err

    row = await db.get(KnowledgeBaseDoc, doc_uuid)
    if row is None or row.owner_user_id != current_user.user_id:
        raise AppError("NOT_FOUND", "Knowledge base document not found", 404)

    await elevenlabs_agent_service.delete_kb_doc(row.el_document_id)
    await db.delete(row)
    await db.flush()

    await _resync_agent(db, current_user.user_id)
    await db.commit()
    return KBDeleteResponse(deleted=True)

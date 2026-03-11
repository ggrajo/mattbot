"""Prompt suggestions API."""

import logging
import uuid

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.middleware.error_handler import AppError

logger = logging.getLogger(__name__)

router = APIRouter()


class PromptSuggestionResponse(BaseModel):
    id: uuid.UUID
    title: str
    prompt_text: str
    category: str | None = None
    sort_order: int = 0

    model_config = {"from_attributes": True}


class PromptSuggestionListResponse(BaseModel):
    suggestions: list[PromptSuggestionResponse]
    total: int


@router.get("", response_model=PromptSuggestionListResponse)
async def list_prompt_suggestions(
    category: str | None = Query(None),
    current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PromptSuggestionListResponse:
    try:
        from app.models.prompt_suggestion import PromptSuggestion

        base = select(PromptSuggestion)
        if category is not None:
            base = base.where(PromptSuggestion.category == category)

        result = await db.execute(base.order_by(PromptSuggestion.sort_order))
        suggestions = list(result.scalars().all())

        return PromptSuggestionListResponse(
            suggestions=[
                PromptSuggestionResponse.model_validate(s) for s in suggestions
            ],
            total=len(suggestions),
        )
    except AppError:
        raise
    except Exception as e:
        logger.exception("Failed to list prompt suggestions")
        raise AppError(
            "SUGGESTION_ERROR", f"Failed to list prompt suggestions: {e}", 500
        )

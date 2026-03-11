"""Prompt suggestions endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.models.prompt_suggestion import PromptSuggestion
from app.schemas.agents import PromptSuggestionItem, PromptSuggestionsResponse

router = APIRouter()


@router.get("", response_model=PromptSuggestionsResponse)
async def list_prompt_suggestions(
    _current_user: CurrentUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> PromptSuggestionsResponse:
    stmt = (
        select(PromptSuggestion)
        .where(PromptSuggestion.is_active.is_(True))
        .order_by(PromptSuggestion.sort_order.asc())
    )

    result = await db.execute(stmt)
    suggestions = result.scalars().all()
    return PromptSuggestionsResponse(
        items=[
            PromptSuggestionItem(
                id=str(s.id),
                title=s.title,
                text=s.text,
                sort_order=s.sort_order,
            )
            for s in suggestions
        ]
    )

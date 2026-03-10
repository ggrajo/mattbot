# Source Generated with Decompyle++
# File: prompt_suggestions.pyc (Python 3.13)

__doc__ = 'Prompt suggestions endpoint.'
from __future__ import annotations
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.dependencies import CurrentUser, get_current_user
from app.database import get_db
from app.models.prompt_suggestion import PromptSuggestion
from app.schemas.agents import PromptSuggestionItem, PromptSuggestionsResponse
router = None()
# WARNING: Decompyle incomplete

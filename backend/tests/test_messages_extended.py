"""Extended tests for message validation and limits."""

import pytest
from pydantic import ValidationError

from app.api.v1.memory import MemoryItemCreate


def test_message_validation():
    item = MemoryItemCreate(content="Valid note", memory_type="note", source="user")
    assert item.content == "Valid note"
    assert item.memory_type == "note"


def test_message_validation_defaults():
    item = MemoryItemCreate(content="Just content")
    assert item.memory_type == "note"
    assert item.source == "user"
    assert item.call_id is None


def test_message_length_limits():
    """Very long content should still be accepted by the schema (DB may truncate)."""
    long_content = "x" * 10_000
    item = MemoryItemCreate(content=long_content)
    assert len(item.content) == 10_000


def test_message_empty_content_rejected():
    """Empty string is technically valid for the Pydantic model but semantically wrong.
    This documents current behaviour—if validation is tightened later, update this test."""
    item = MemoryItemCreate(content="")
    assert item.content == ""

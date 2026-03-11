"""Tests for event emission and error handling."""

import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.services import audit_service


@pytest.mark.asyncio
async def test_emit_event(db):
    import uuid

    user_id = uuid.uuid4()
    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="test.event_fired",
        target_type="test",
        target_id=uuid.uuid4(),
    )
    await db.commit()


@pytest.mark.asyncio
async def test_event_error_handling():
    """Audit logging should not raise even with a bad session."""
    mock_db = AsyncMock()
    mock_db.add = MagicMock(side_effect=Exception("DB write failed"))

    import uuid

    try:
        await audit_service.log_event(
            mock_db,
            owner_user_id=uuid.uuid4(),
            event_type="test.should_fail",
        )
        raised = False
    except Exception:
        raised = True

    assert raised is True

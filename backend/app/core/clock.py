"""Centralised clock helpers.

All application code should call ``utcnow()`` instead of
``datetime.now(UTC)`` so that every timestamp stored in the database
is a **naive** UTC datetime, consistent with PostgreSQL's
``TIMESTAMP WITHOUT TIME ZONE`` columns.
"""

from __future__ import annotations

from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return the current UTC time as a **naive** datetime (no tzinfo)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)

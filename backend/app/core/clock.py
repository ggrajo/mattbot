"""Centralized UTC clock for database-compatible naive datetimes.

All database columns use TIMESTAMP WITHOUT TIME ZONE, so we must
return naive datetimes (no tzinfo) to avoid asyncpg DataError when
comparing or assigning to those columns.
"""

from __future__ import annotations

from datetime import UTC, datetime


def utcnow() -> datetime:
    """Return current UTC time as a naive datetime."""
    return datetime.now(UTC).replace(tzinfo=None)

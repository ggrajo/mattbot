"""Custom SQLAlchemy column types shared across models."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import TypeDecorator
from sqlalchemy.dialects.postgresql import INET, JSONB


class JsonbDict(TypeDecorator):
    """JSONB column that transparently stores/retrieves Python dicts/lists."""

    impl = JSONB
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return value

    def process_result_value(self, value, dialect):
        return value if value is not None else {}


class InetString(TypeDecorator):
    """Stores INET as a plain string (no host-bits suffix)."""

    impl = INET
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return str(value) if value else None

    def process_result_value(self, value, dialect):
        return str(value) if value else None


def tz_datetime() -> datetime:
    """Return a timezone-aware UTC datetime for use as a default."""
    return datetime.now(timezone.utc)


def portable_json(value):
    """Ensure a value is JSON-serializable (pass-through helper)."""
    if value is None:
        return None
    return value

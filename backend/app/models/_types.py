"""Custom SQLAlchemy types that work across PostgreSQL and SQLite."""

from __future__ import annotations

from typing import Any

from sqlalchemy import DateTime, Text, TypeDecorator
from sqlalchemy.dialects.postgresql import INET as PG_INET
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from sqlalchemy.engine.interfaces import Dialect


class InetString(TypeDecorator[str]):
    """Stores IP addresses as INET on PostgreSQL, TEXT on other dialects."""

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect) -> Any:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_INET())
        return dialect.type_descriptor(Text())


class JsonbDict(TypeDecorator[Any]):
    """Stores JSON as JSONB on PostgreSQL, TEXT on other dialects."""

    impl = Text
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect) -> Any:
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_JSONB())
        return dialect.type_descriptor(Text())

    def process_bind_param(self, value: Any, dialect: Dialect) -> Any:
        if dialect.name != "postgresql" and value is not None:
            import json

            return json.dumps(value)
        return value

    def process_result_value(self, value: Any, dialect: Dialect) -> Any:
        if dialect.name != "postgresql" and value is not None:
            import json

            return json.loads(value)
        return value


def tz_datetime() -> DateTime:
    """Create a fresh timezone-aware DateTime instance."""
    return DateTime(timezone=True)

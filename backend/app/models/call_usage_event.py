import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CallUsageEvent(Base):
    __tablename__ = "call_usage_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    call_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calls.id", ondelete="SET NULL")
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    idempotency_key: Mapped[str] = mapped_column(String(128), unique=True, nullable=False)
    minutes_billed: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    source: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("call"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )

    __table_args__ = (
        Index("call_usage_events_call_idx", "call_id"),
        Index("call_usage_events_idemp_idx", "idempotency_key", unique=True),
    )

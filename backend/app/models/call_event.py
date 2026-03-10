import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import JsonbDict


class CallEvent(Base):
    __tablename__ = "call_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    call_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    provider_status: Mapped[str | None] = mapped_column(String(30))
    event_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    details_redacted: Mapped[str | None] = mapped_column(JsonbDict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )

    call: Mapped["Call | None"] = relationship("Call", back_populates="events", uselist=False)

    __table_args__ = (
        UniqueConstraint("call_id", "event_type", "provider_status", name="uq_call_events_dedupe"),
        Index("call_events_call_idx", "call_id"),
        Index("call_events_user_idx", "owner_user_id"),
    )

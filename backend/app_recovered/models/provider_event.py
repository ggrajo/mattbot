import datetime
import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ProviderEvent(Base):
    __tablename__ = "provider_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    provider: Mapped[str] = mapped_column(String(20), nullable=False)
    provider_event_id: Mapped[str | None] = mapped_column(Text)
    provider_call_sid: Mapped[str | None] = mapped_column(Text)
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    received_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    processed_at: Mapped[datetime | None] = mapped_column(DateTime)
    process_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("received"))
    failure_reason: Mapped[str | None] = mapped_column(Text)
    call_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("calls.id", ondelete="SET NULL"))
    owner_user_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"))
    payload_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    payload_redacted: Mapped[str | None] = mapped_column(JsonbDict)
    signature_valid: Mapped[bool] = mapped_column(Boolean, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    __table_args__ = (CheckConstraint("provider IN ('twilio', 'elevenlabs')", name="ck_provider_events_provider"), CheckConstraint("process_status IN ('received', 'processed', 'failed')", name="ck_provider_events_status"), Index("provider_events_status_idx", "process_status"), Index("provider_events_call_sid_idx", "provider_call_sid"),)

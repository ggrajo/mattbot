import datetime
import uuid

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    source_type: Mapped[str] = mapped_column(String(30), nullable=False)
    direction: Mapped[str] = mapped_column(String(10), nullable=False, server_default=text("inbound"))
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    started_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime)
    duration_seconds: Mapped[int | None] = mapped_column(Integer)
    caller_phone_ciphertext: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    caller_phone_nonce: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    caller_phone_key_version: Mapped[int] = mapped_column(Integer, nullable=False)
    caller_phone_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    caller_phone_last4: Mapped[str] = mapped_column(String(4), nullable=False)
    caller_display: Mapped[str | None] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("twilio"))
    provider_call_sid: Mapped[str] = mapped_column(Text, nullable=False)
    provider_parent_call_sid: Mapped[str | None] = mapped_column(Text)
    agent_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="SET NULL"))
    voice_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("voice_catalog.id", ondelete="SET NULL"))
    forwarding_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    forwarding_verification_hint: Mapped[str | None] = mapped_column(Text)
    missing_summary: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    missing_transcript: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    missing_labels: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    from_masked: Mapped[str] = mapped_column(Text, nullable=False)
    to_masked: Mapped[str] = mapped_column(Text, nullable=False)
    handoff_eligible: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    handoff_status: Mapped[str | None] = mapped_column(Text)
    handoff_offered_at: Mapped[datetime | None] = mapped_column(DateTime)
    handoff_offer_expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    handoff_accepted_at: Mapped[datetime | None] = mapped_column(DateTime)
    handoff_selected_device_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    handoff_attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    handoff_failure_reason: Mapped[str | None] = mapped_column(Text)
    handoff_loop_detected: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    booked_calendar_event_id: Mapped[str | None] = mapped_column(Text)
    booked_calendar_event_summary: Mapped[str | None] = mapped_column(Text)
    retention_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    events: Mapped[list["CallEvent"]] = relationship("CallEvent", back_populates="call", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")

    __table_args__ = (CheckConstraint("source_type IN ('dedicated_number', 'forwarded')", name="ck_calls_source_type"), CheckConstraint("direction IN ('inbound')", name="ck_calls_direction"), CheckConstraint("status IN ('created', 'inbound_received', 'twiml_responded', 'in_progress', 'completed', 'partial', 'failed', 'canceled')", name="ck_calls_status"), CheckConstraint("provider IN ('twilio')", name="ck_calls_provider"), CheckConstraint("handoff_status IS NULL OR handoff_status IN ('not_applicable', 'eligible_pending_minimum_data', 'urgent_candidate', 'offered', 'accepted', 'declined', 'expired', 'failed', 'transfer_starting', 'transfer_connected', 'transfer_failed', 'transfer_cancelled')", name="ck_calls_handoff_status"), UniqueConstraint("provider", "provider_call_sid", name="uq_calls_provider_sid"), Index("calls_user_started_idx", "owner_user_id"), Index("calls_user_status_idx", "owner_user_id", "status"), Index("calls_provider_sid_idx", "provider_call_sid"), Index("calls_user_caller_hash_idx", "owner_user_id", "caller_phone_hash"), Index("calls_retention_idx", "retention_expires_at"),)

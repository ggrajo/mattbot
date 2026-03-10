from datetime import UTC
import datetime
import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CallArtifact(Base):
    __tablename__ = "call_artifacts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    call_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calls.id", ondelete="CASCADE"), unique=True, nullable=False)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    summary_text_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    summary_text_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    summary_text_key_version: Mapped[int | None] = mapped_column(Integer)
    summary_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("pending"))
    structured_extraction: Mapped[str | None] = mapped_column(JsonbDict)
    labels_json: Mapped[str | None] = mapped_column(JsonbDict)
    labels_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("pending"))
    transcript_text_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    transcript_text_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    transcript_text_key_version: Mapped[int | None] = mapped_column(Integer)
    transcript_provider: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("elevenlabs"))
    transcript_provider_ref: Mapped[str | None] = mapped_column(Text)
    transcript_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default=text("pending"))
    transcript_last_checked_at: Mapped[datetime | None] = mapped_column(DateTime)
    notes_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    notes_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    notes_key_version: Mapped[int | None] = mapped_column(Integer)
    idempotency_key: Mapped[str | None] = mapped_column(String(64), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    __table_args__ = (CheckConstraint("summary_status IN ('pending', 'processing', 'ready', 'failed', 'not_available')", name="ck_call_artifacts_summary_status"), CheckConstraint("labels_status IN ('pending', 'processing', 'ready', 'failed', 'not_available')", name="ck_call_artifacts_labels_status"), CheckConstraint("transcript_status IN ('pending', 'processing', 'ready', 'failed', 'not_available')", name="ck_call_artifacts_transcript_status"), Index("call_artifacts_call_id_idx", "call_id"), Index("call_artifacts_owner_idx", "owner_user_id"),)

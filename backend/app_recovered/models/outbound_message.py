from datetime import UTC
import datetime
import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class OutboundMessage(Base):
    __tablename__ = "outbound_messages"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    call_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("calls.id", ondelete="SET NULL"))
    action_type: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("text_back"))
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("drafted"))
    from_number_e164: Mapped[str | None] = mapped_column(Text)
    to_number_ciphertext: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    to_number_nonce: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    to_number_key_version: Mapped[int] = mapped_column(Integer, nullable=False)
    to_number_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    to_number_last4: Mapped[str] = mapped_column(String(4), nullable=False)
    draft_body_ciphertext: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    draft_body_nonce: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    draft_body_key_version: Mapped[int] = mapped_column(Integer, nullable=False)
    final_body_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    final_body_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    final_body_key_version: Mapped[int | None] = mapped_column(Integer)
    template_id_used: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    approved_at: Mapped[datetime | None] = mapped_column(DateTime)
    approved_by_device_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    last_error_code: Mapped[str | None] = mapped_column(String(60))
    last_error_message_short: Mapped[str | None] = mapped_column(Text)
    retention_expires_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    send_attempts: Mapped[list["TextSendAttempt"]] = relationship("TextSendAttempt", back_populates="message", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")

    __table_args__ = (CheckConstraint("status IN ('drafted', 'awaiting_approval', 'approved', 'sending', 'sent', 'delivered', 'failed', 'cancelled')", name="ck_outbound_messages_status"), Index("outbound_messages_user_call_idx", "owner_user_id", "call_id"), Index("outbound_messages_status_idx", "status"), Index("outbound_messages_user_created_idx", "owner_user_id"),)

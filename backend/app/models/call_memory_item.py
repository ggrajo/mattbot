import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CallMemoryItem(Base):
    __tablename__ = "call_memory_items"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    source_call_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calls.id", ondelete="SET NULL")
    )
    caller_phone_hash: Mapped[str | None] = mapped_column(String(64))
    memory_type: Mapped[str] = mapped_column(String(40), nullable=False)
    subject: Mapped[str | None] = mapped_column(Text)
    value_ciphertext: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    value_nonce: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    value_key_version: Mapped[int] = mapped_column(Integer, nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float)
    user_confirmed: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)

    __table_args__ = (
        CheckConstraint(
            "memory_type IN ("
            "'caller_display_name', "
            "'relationship_tag', "
            "'callback_window_preference', "
            "'communication_preference', "
            "'repeated_reason_pattern')",
            name="ck_call_memory_items_type",
        ),
        Index("call_memory_items_user_active_idx", "owner_user_id"),
        Index("call_memory_items_user_caller_active_idx", "owner_user_id", "caller_phone_hash"),
    )

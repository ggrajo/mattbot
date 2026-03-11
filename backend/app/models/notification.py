import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    type: Mapped[str] = mapped_column(Text, nullable=False)
    priority: Mapped[str] = mapped_column(Text, nullable=False, server_default="normal")
    source_entity_type: Mapped[str | None] = mapped_column(Text)
    source_entity_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    privacy_mode_applied: Mapped[str] = mapped_column(Text, nullable=False)
    quiet_hours_applied: Mapped[str] = mapped_column(Text, nullable=False, server_default="none")
    content_hash: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )

    __table_args__ = (
        CheckConstraint(
            "type IN ('call_screened_created', "
            "'call_important_detected', "
            "'handoff_available', "
            "'call_processing_error', "
            "'reminder_due')",
            name="ck_notifications_type",
        ),
        CheckConstraint(
            "priority IN ('low', 'normal', 'high', 'critical')", name="ck_notifications_priority"
        ),
        CheckConstraint(
            "source_entity_type IN ("
            "'call', 'handoff_offer', 'reminder', "
            "'system_error') "
            "OR source_entity_type IS NULL",
            name="ck_notifications_source_entity_type",
        ),
        CheckConstraint(
            "privacy_mode_applied IN ('private', 'preview')", name="ck_notifications_privacy_mode"
        ),
        CheckConstraint(
            "quiet_hours_applied IN ('none', 'silent', 'suppressed')",
            name="ck_notifications_quiet_hours",
        ),
        Index("notifications_user_created_idx", "owner_user_id"),
    )

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Reminder(Base):
    __tablename__ = "reminders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    call_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("calls.id", ondelete="SET NULL")
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    due_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    timezone_at_creation: Mapped[str | None] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    created_by_device_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))

    __table_args__ = (
        CheckConstraint(
            "status IN ('scheduled', 'triggered', 'completed', 'cancelled')",
            name="ck_reminders_status",
        ),
        Index("reminders_user_due_idx", "owner_user_id", "due_at"),
        Index("reminders_scheduled_due_idx", "due_at"),
    )

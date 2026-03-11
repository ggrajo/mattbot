import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Index, Integer, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Call(Base):
    __tablename__ = "calls"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    twilio_call_sid: Mapped[str | None] = mapped_column(
        String(64), unique=True, nullable=True
    )
    from_number: Mapped[str] = mapped_column(String(20), nullable=False)
    to_number: Mapped[str] = mapped_column(String(20), nullable=False)
    direction: Mapped[str] = mapped_column(
        String(10), nullable=False, default="inbound"
    )
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="ringing"
    )
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    ended_reason: Mapped[str | None] = mapped_column(String(50), nullable=True)
    started_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()")
    )
    answered_at: Mapped[datetime | None] = mapped_column(nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()"), onupdate=datetime.utcnow
    )

    events: Mapped[list["CallEvent"]] = relationship(
        back_populates="call", cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("ix_calls_user_status", "user_id", "status"),
    )

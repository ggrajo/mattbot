import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PushToken(Base):
    __tablename__ = "push_tokens"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False
    )
    provider: Mapped[str] = mapped_column(String(10), nullable=False)
    token: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)

    device: Mapped["Device | None"] = relationship(
        "Device", back_populates="push_tokens", uselist=False
    )

    __table_args__ = (
        CheckConstraint("provider IN ('fcm', 'apns')", name="ck_push_tokens_provider"),
        Index("uq_push_tokens_active_token", "provider", "token", unique=True),
        Index("push_tokens_device_idx", "device_id"),
    )

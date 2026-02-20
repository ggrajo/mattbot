import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class PushToken(Base):
    __tablename__ = "push_tokens"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
    )
    provider: Mapped[str] = mapped_column(String(10), nullable=False)
    token: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()")
    )
    revoked_at: Mapped[datetime | None] = mapped_column(nullable=True)

    device: Mapped["Device"] = relationship(back_populates="push_tokens")  # noqa: F821

    __table_args__ = (
        CheckConstraint("provider IN ('fcm')", name="ck_push_tokens_provider"),
        UniqueConstraint("provider", "token", name="uq_push_tokens_provider_token"),
        Index("push_tokens_device_idx", "device_id"),
    )

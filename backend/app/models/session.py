import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import InetString


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="CASCADE"), nullable=False
    )
    access_token_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    access_token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    access_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    refresh_token_hash: Mapped[str] = mapped_column(String(64), unique=True, nullable=False)
    refresh_expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    last_refresh_at: Mapped[datetime | None] = mapped_column(DateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)
    revoke_reason: Mapped[str | None] = mapped_column(Text)
    ip_created: Mapped[str | None] = mapped_column(InetString)
    ip_last: Mapped[str | None] = mapped_column(InetString)
    user_agent: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )

    user: Mapped["User | None"] = relationship("User", back_populates="sessions", uselist=False)
    device: Mapped["Device | None"] = relationship(
        "Device", back_populates="sessions", uselist=False
    )

    __table_args__ = (
        Index("sessions_user_idx", "owner_user_id"),
        Index("sessions_device_idx", "device_id"),
        Index("sessions_active_by_device_idx", "device_id"),
        Index("sessions_refresh_exp_idx", "refresh_expires_at"),
    )

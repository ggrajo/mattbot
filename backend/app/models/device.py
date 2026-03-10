from datetime import UTC
from datetime import datetime
import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    platform: Mapped[str] = mapped_column(String(10), nullable=False)
    device_name: Mapped[str | None] = mapped_column(Text)
    app_version: Mapped[str | None] = mapped_column(String(30))
    os_version: Mapped[str | None] = mapped_column(String(30))
    last_ip: Mapped[str | None] = mapped_column(String(45))
    last_location: Mapped[str | None] = mapped_column(String(120))
    is_remembered: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime)
    pin_hash: Mapped[str | None] = mapped_column(String(255))
    pin_failed_attempts: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    pin_locked_until: Mapped[datetime | None] = mapped_column(DateTime)
    pin_set_at: Mapped[datetime | None] = mapped_column(DateTime)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime)
    revoke_reason: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    user: Mapped["User | None"] = relationship("User", back_populates="devices", uselist=False)
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="device", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")
    push_tokens: Mapped[list["PushToken"]] = relationship("PushToken", back_populates="device", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")

    __table_args__ = (CheckConstraint("platform IN ('ios', 'android', 'web')", name="ck_devices_platform"), Index("devices_user_idx", "owner_user_id"), Index("devices_user_active_idx", "owner_user_id"),)

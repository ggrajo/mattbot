import uuid
from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _tz() -> DateTime:
    return DateTime(timezone=True)


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    platform: Mapped[str] = mapped_column(String(10), nullable=False)
    device_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    app_version: Mapped[str | None] = mapped_column(String(30), nullable=True)
    os_version: Mapped[str | None] = mapped_column(String(30), nullable=True)
    last_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)
    last_location: Mapped[str | None] = mapped_column(String(120), nullable=True)
    is_remembered: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    last_seen_at: Mapped[datetime | None] = mapped_column(_tz(), nullable=True)
    pin_hash: Mapped[str | None] = mapped_column(String(255), nullable=True)
    pin_failed_attempts: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    pin_locked_until: Mapped[datetime | None] = mapped_column(_tz(), nullable=True)
    pin_set_at: Mapped[datetime | None] = mapped_column(_tz(), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(_tz(), nullable=True)
    revoke_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        _tz(), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        _tz(), nullable=False, server_default=text("now()"),
        onupdate=lambda: datetime.now(UTC),
    )

    user: Mapped["User"] = relationship(back_populates="devices")  # noqa: F821
    sessions: Mapped[list["Session"]] = relationship(  # noqa: F821
        back_populates="device", cascade="all, delete-orphan"
    )
    push_tokens: Mapped[list["PushToken"]] = relationship(  # noqa: F821
        back_populates="device", cascade="all, delete-orphan"
    )

    __table_args__ = (
        CheckConstraint(
            "platform IN ('ios', 'android', 'web')",
            name="ck_devices_platform",
        ),
        Index("devices_user_idx", "owner_user_id"),
        Index(
            "devices_user_active_idx",
            "owner_user_id",
            postgresql_where=text("revoked_at IS NULL"),
        ),
    )

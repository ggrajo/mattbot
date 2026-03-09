import uuid
from datetime import UTC, datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import InetString


def _tz() -> DateTime:
    return DateTime(timezone=True)


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    device_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("devices.id", ondelete="CASCADE"),
        nullable=False,
    )
    access_token_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), nullable=False, default=uuid.uuid4
    )
    access_token_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )
    access_expires_at: Mapped[datetime] = mapped_column(_tz(), nullable=False)
    refresh_token_hash: Mapped[str] = mapped_column(
        String(64), nullable=False, unique=True
    )
    refresh_expires_at: Mapped[datetime] = mapped_column(_tz(), nullable=False)
    last_refresh_at: Mapped[datetime | None] = mapped_column(_tz(), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(_tz(), nullable=True)
    revoke_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_created: Mapped[str | None] = mapped_column(InetString(), nullable=True)
    ip_last: Mapped[str | None] = mapped_column(InetString(), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        _tz(), nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        _tz(), nullable=False, server_default=text("now()"),
        onupdate=lambda: datetime.now(UTC),
    )

    user: Mapped["User"] = relationship(back_populates="sessions")  # noqa: F821
    device: Mapped["Device"] = relationship(back_populates="sessions")  # noqa: F821

    __table_args__ = (
        Index("sessions_user_idx", "owner_user_id"),
        Index("sessions_device_idx", "device_id"),
        Index(
            "sessions_active_by_device_idx",
            "device_id",
            postgresql_where=text("revoked_at IS NULL"),
        ),
        Index("sessions_refresh_exp_idx", "refresh_expires_at"),
    )

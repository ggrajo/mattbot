import uuid
from datetime import datetime

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class CallModeConfig(Base):
    __tablename__ = "call_mode_configs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
    )
    mode_a_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    mode_b_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    access_control: Mapped[str] = mapped_column(
        String(30), nullable=False, default="everyone"
    )
    forwarding_number: Mapped[str | None] = mapped_column(String(20), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()"), onupdate=datetime.utcnow
    )

    __table_args__ = (
        CheckConstraint(
            "access_control IN ('everyone', 'contacts_only', 'allowlist', 'blocklist')",
            name="ck_call_mode_configs_access_control",
        ),
        Index("call_mode_configs_user_idx", "user_id"),
    )

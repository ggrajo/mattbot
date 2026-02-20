import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MfaMethod(Base):
    __tablename__ = "mfa_methods"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
    )
    method_type: Mapped[str] = mapped_column(String(20), nullable=False)
    totp_secret_ciphertext: Mapped[bytes | None] = mapped_column(nullable=True)
    totp_secret_nonce: Mapped[bytes | None] = mapped_column(nullable=True)
    totp_secret_key_version: Mapped[int | None] = mapped_column(nullable=True)
    is_primary: Mapped[bool] = mapped_column(default=False, nullable=False)
    enabled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    disabled_at: Mapped[datetime | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()"), onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="mfa_methods")  # noqa: F821

    __table_args__ = (
        CheckConstraint(
            "method_type IN ('totp', 'email_otp')",
            name="ck_mfa_methods_type",
        ),
        Index(
            "uq_mfa_methods_primary_active",
            "owner_user_id",
            unique=True,
            postgresql_where=text("is_primary = true AND disabled_at IS NULL"),
        ),
        Index("mfa_methods_user_idx", "owner_user_id"),
    )

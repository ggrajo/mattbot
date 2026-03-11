import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    LargeBinary,
    String,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MfaMethod(Base):
    __tablename__ = "mfa_methods"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    method_type: Mapped[str] = mapped_column(String(20), nullable=False)
    totp_secret_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    totp_secret_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    totp_secret_key_version: Mapped[int | None] = mapped_column(Integer)
    is_primary: Mapped[bool] = mapped_column(Boolean, nullable=False)
    enabled_at: Mapped[datetime | None] = mapped_column(DateTime)
    disabled_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )

    user: Mapped["User | None"] = relationship("User", back_populates="mfa_methods", uselist=False)

    __table_args__ = (
        CheckConstraint("method_type IN ('totp', 'email_otp')", name="ck_mfa_methods_type"),
        Index("uq_mfa_methods_primary_active", "owner_user_id", unique=True),
        Index("mfa_methods_user_idx", "owner_user_id"),
    )

import uuid
from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import JsonbDict


class ForwardingVerificationAttempt(Base):
    __tablename__ = "forwarding_verification_attempts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    verification_code: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    initiated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    twilio_call_sid: Mapped[str | None] = mapped_column(Text)
    details_redacted: Mapped[str | None] = mapped_column(JsonbDict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )

    user: Mapped["User | None"] = relationship(
        "User", back_populates="forwarding_verification_attempts", uselist=False
    )

    __table_args__ = (
        CheckConstraint(
            "status IN ('pending', 'passed', 'failed', 'expired')",
            name="ck_fwd_verification_status",
        ),
        Index("ix_fwd_verification_user_status", "owner_user_id", "status"),
    )

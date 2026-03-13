import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    UniqueConstraint,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SpamEntry(Base):
    __tablename__ = "spam_entries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    phone_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    phone_last4: Mapped[str] = mapped_column(String(4), nullable=False)
    spam_score: Mapped[float] = mapped_column(Float, nullable=False, server_default=text("0"))
    spam_call_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    first_flagged_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    last_flagged_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    auto_blocked: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=text("false")
    )
    source: Mapped[str] = mapped_column(String(10), nullable=False, server_default="auto")

    __table_args__ = (
        UniqueConstraint("owner_user_id", "phone_hash", name="uq_spam_entries_user_phone"),
        Index("spam_entries_user_idx", "owner_user_id"),
    )

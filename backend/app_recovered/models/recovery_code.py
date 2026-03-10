import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RecoveryCode(Base):
    __tablename__ = "recovery_codes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    code_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    used_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    user: Mapped["User | None"] = relationship("User", back_populates="recovery_codes", uselist=False)

    __table_args__ = (UniqueConstraint("owner_user_id", "code_hash", name="uq_recovery_codes_user_hash"), Index("recovery_codes_user_idx", "owner_user_id"),)

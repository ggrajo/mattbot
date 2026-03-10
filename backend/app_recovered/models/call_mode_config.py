from datetime import UTC
import datetime
import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CallModeConfig(Base):
    __tablename__ = "call_mode_configs"

    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    mode_a_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    mode_b_enabled: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    access_control: Mapped[str] = mapped_column(String(20), nullable=False, server_default='everyone')
    personal_number_e164_hash: Mapped[str | None] = mapped_column(Text)
    personal_number_e164_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    personal_number_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    personal_number_key_version: Mapped[int | None] = mapped_column(Integer)
    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime)
    verification_status: Mapped[str] = mapped_column(String(20), nullable=False, server_default='unverified')
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    user: Mapped["User | None"] = relationship("User", back_populates="call_mode_config", uselist=False)

    __table_args__ = (CheckConstraint("access_control IN ('everyone', 'contacts', 'vip')", name="ck_call_mode_configs_access_control"), CheckConstraint("verification_status IN ('unverified', 'pending', 'verified', 'failed')", name="ck_call_mode_configs_verification_status"),)

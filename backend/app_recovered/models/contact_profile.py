from datetime import UTC
import datetime
import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ContactProfile(Base):
    __tablename__ = "contact_profiles"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    phone_ciphertext: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    phone_nonce: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    phone_key_version: Mapped[int] = mapped_column(Integer, nullable=False)
    phone_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    phone_last4: Mapped[str] = mapped_column(String(4), nullable=False)
    display_name: Mapped[str | None] = mapped_column(Text)
    company: Mapped[str | None] = mapped_column(String(200))
    relationship: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(254))
    notes: Mapped[str | None] = mapped_column(Text)
    category: Mapped[str] = mapped_column(String(50), nullable=False, server_default='other')
    is_vip: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    is_blocked: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    block_reason: Mapped[str | None] = mapped_column(Text)
    ai_temperament_preset: Mapped[str | None] = mapped_column(String(40))
    ai_greeting_template: Mapped[str | None] = mapped_column(String(40))
    ai_greeting_instructions_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    ai_greeting_instructions_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    ai_greeting_instructions_key_version: Mapped[int | None] = mapped_column(Integer)
    ai_swearing_rule: Mapped[str | None] = mapped_column(String(20))
    ai_max_call_length_seconds: Mapped[int | None] = mapped_column(Integer)
    ai_custom_instructions_ciphertext: Mapped[str | None] = mapped_column(LargeBinary)
    ai_custom_instructions_nonce: Mapped[str | None] = mapped_column(LargeBinary)
    ai_custom_instructions_key_version: Mapped[int | None] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)

    __table_args__ = (UniqueConstraint("owner_user_id", "phone_hash", name="uq_contact_profiles_user_phone"), Index("contact_profiles_user_idx", "owner_user_id"), Index("contact_profiles_user_category_idx", "owner_user_id", "category"), CheckConstraint("ai_temperament_preset IS NULL OR ai_temperament_preset IN ('professional_polite', 'casual_friendly', 'short_and_direct', 'warm_and_supportive', 'formal', 'custom')", name="ck_contact_profiles_temperament"), CheckConstraint("ai_swearing_rule IS NULL OR ai_swearing_rule IN ('no_swearing', 'mirror_caller', 'allow')", name="ck_contact_profiles_swearing"), CheckConstraint("ai_greeting_template IS NULL OR ai_greeting_template IN ('standard', 'brief', 'formal', 'custom')", name="ck_contact_profiles_greeting_template"),)

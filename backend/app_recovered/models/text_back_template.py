from datetime import UTC
import datetime
import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class TextBackTemplate(Base):
    __tablename__ = "text_back_templates"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    category: Mapped[str] = mapped_column(Text, nullable=False)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    tone_tag: Mapped[str] = mapped_column(Text, nullable=False)
    enabled_by_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    is_builtin: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    __table_args__ = (CheckConstraint("category IN ('busy', 'callback_request', 'request_details', 'reschedule', 'wrong_number', 'sales_decline')", name="ck_text_back_templates_category"), CheckConstraint("tone_tag IN ('neutral', 'warm', 'formal', 'concise')", name="ck_text_back_templates_tone_tag"), Index("text_back_templates_category_idx", "category"),)

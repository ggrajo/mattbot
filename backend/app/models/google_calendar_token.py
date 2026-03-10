from datetime import UTC
from datetime import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class GoogleCalendarToken(Base):
    __tablename__ = "google_calendar_tokens"

    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    access_token_ciphertext: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    access_token_nonce: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    refresh_token_ciphertext: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    refresh_token_nonce: Mapped[str] = mapped_column(LargeBinary, nullable=False)
    key_version: Mapped[int] = mapped_column(Integer, nullable=False)
    token_expiry: Mapped[datetime | None] = mapped_column(DateTime)
    google_email: Mapped[str] = mapped_column(String(255), nullable=False)
    calendar_id: Mapped[str] = mapped_column(String(255), nullable=False, server_default='primary')
    connected_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

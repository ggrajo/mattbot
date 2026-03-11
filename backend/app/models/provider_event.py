import uuid
from datetime import datetime

from sqlalchemy import String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ProviderEvent(Base):
    __tablename__ = "provider_events"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    provider: Mapped[str] = mapped_column(
        String(20), nullable=False, default="twilio"
    )
    provider_event_id: Mapped[str | None] = mapped_column(
        String(128), unique=True, nullable=True
    )
    event_type: Mapped[str] = mapped_column(String(100), nullable=False)
    payload_redacted: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()")
    )

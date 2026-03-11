import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, default="MattBot"
    )
    system_prompt: Mapped[str | None] = mapped_column(Text, nullable=True)
    greeting_message: Mapped[str | None] = mapped_column(String(500), nullable=True)
    voice_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    language: Mapped[str] = mapped_column(String(10), nullable=False, default="en")
    personality: Mapped[str] = mapped_column(
        String(30), nullable=False, default="professional"
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        nullable=False, server_default=text("now()"), onupdate=datetime.utcnow
    )

    configs: Mapped[list["AgentConfig"]] = relationship(  # noqa: F821
        back_populates="agent", cascade="all, delete-orphan"
    )

import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AgentConfig(Base):
    __tablename__ = "agent_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    agent_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("agents.id", ondelete="CASCADE"), unique=True, nullable=False)
    voice_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("voice_catalog.id", ondelete="SET NULL"))
    user_instructions: Mapped[str | None] = mapped_column(Text)
    greeting_instructions: Mapped[str | None] = mapped_column(Text)
    system_prompt_key: Mapped[str] = mapped_column(String(40), nullable=False, server_default='default_v1')
    revision: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("1"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    agent: Mapped["Agent | None"] = relationship("Agent", back_populates="config", uselist=False)

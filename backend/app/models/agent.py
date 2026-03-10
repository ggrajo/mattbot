from datetime import UTC
from datetime import datetime
import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Agent(Base):
    __tablename__ = "agents"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False, server_default='Call Screener')
    function_type: Mapped[str] = mapped_column(String(40), nullable=False, server_default='call_screener')
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    status: Mapped[str] = mapped_column(String(20), nullable=False, server_default='active')
    elevenlabs_agent_id: Mapped[str | None] = mapped_column(String(50))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    user: Mapped["User | None"] = relationship("User", back_populates="agents", uselist=False)
    config: Mapped["AgentConfig | None"] = relationship("AgentConfig", back_populates="agent", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update", uselist=False)

    __table_args__ = (CheckConstraint("status IN ('active', 'archived')", name="ck_agents_status"), Index("uq_agents_user_default", "owner_user_id", unique=True), Index("agents_owner_user_id_idx", "owner_user_id"),)

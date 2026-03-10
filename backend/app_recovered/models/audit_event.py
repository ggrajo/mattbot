import datetime
import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    actor_type: Mapped[str] = mapped_column(String(20), nullable=False)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    event_type: Mapped[str] = mapped_column(String(60), nullable=False)
    event_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    target_type: Mapped[str | None] = mapped_column(String(30))
    target_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True))
    ip: Mapped[str | None] = mapped_column(InetString)
    user_agent: Mapped[str | None] = mapped_column(Text)
    details: Mapped[str | None] = mapped_column(JsonbDict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    user: Mapped["User | None"] = relationship("User", back_populates="audit_events", uselist=False)

    __table_args__ = (CheckConstraint("actor_type IN ('user', 'admin', 'system', 'service')", name="ck_audit_events_actor_type"), Index("audit_events_user_time_idx", "owner_user_id"), Index("audit_events_type_time_idx", "event_type"),)

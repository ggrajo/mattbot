import datetime
import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class HandoffOffer(Base):
    __tablename__ = "handoff_offers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    call_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("calls.id", ondelete="CASCADE"), nullable=False)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default='offered')
    offer_reason: Mapped[str | None] = mapped_column(Text)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=False)
    selected_device_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="SET NULL"))
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime)
    declined_at: Mapped[datetime | None] = mapped_column(DateTime)
    preview_payload: Mapped[str | None] = mapped_column(JsonbDict)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    __table_args__ = (UniqueConstraint("call_id", name="uq_handoff_offers_call"), CheckConstraint("status IN ('offered', 'accepted', 'declined', 'expired')", name="ck_handoff_offers_status"), CheckConstraint("offer_reason IS NULL OR offer_reason IN ('always', 'vip', 'urgent', 'vip_and_urgent')", name="ck_handoff_offers_reason"), Index("handoff_offers_user_idx", "owner_user_id"), Index("handoff_offers_pending_idx", "status", "expires_at"),)

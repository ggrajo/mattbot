import datetime
import uuid

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class NotificationDelivery(Base):
    __tablename__ = "notification_deliveries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    notification_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("notifications.id", ondelete="CASCADE"), nullable=False)
    device_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), ForeignKey("devices.id", ondelete="SET NULL"))
    provider: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False, server_default='queued')
    attempt_count: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    next_attempt_at: Mapped[datetime | None] = mapped_column(DateTime)
    last_attempt_at: Mapped[datetime | None] = mapped_column(DateTime)
    provider_message_id: Mapped[str | None] = mapped_column(Text)
    last_error_code: Mapped[str | None] = mapped_column(Text)
    last_error_message_short: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    __table_args__ = (CheckConstraint("provider IN ('apns', 'fcm')", name="ck_notification_deliveries_provider"), CheckConstraint("status IN ('queued', 'sending', 'provider_accepted', 'provider_rejected', 'delivered_ack', 'expired', 'cancelled')", name="ck_notification_deliveries_status"), UniqueConstraint("notification_id", "device_id", name="uq_notification_deliveries_notif_device"),)

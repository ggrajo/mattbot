"""Upgrade rule within a config version."""
import uuid

from sqlalchemy import ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class BillingPlanConfigRule(Base):
    __tablename__ = "billing_plan_config_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("billing_plan_configs.id", ondelete="CASCADE"), nullable=False)
    from_plan: Mapped[str] = mapped_column(String(30), nullable=False)
    to_plan: Mapped[str] = mapped_column(String(30), nullable=False)
    trigger: Mapped[str] = mapped_column(String(30), nullable=False, server_default='minutes_exceeded')

    __table_args__ = (UniqueConstraint("config_id", "from_plan", name="uq_billing_plan_config_rules_from"),)

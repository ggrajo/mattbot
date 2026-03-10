import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def _tz() -> DateTime:
    return DateTime(timezone=True)


class BillingPlanConfigRow(Base):
    """A versioned billing plan configuration.

    Only one row may have is_active=True at a time (enforced by partial
    unique index). When the admin portal exists, creating a new active
    config automatically deactivates the previous one.
    """

    __tablename__ = "billing_plan_configs"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    created_at: Mapped[datetime] = mapped_column(_tz(), nullable=False, server_default=text("now()"))
    created_by_admin_id: Mapped[uuid.UUID | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("uq_billing_plan_configs_active", "is_active", unique=True, postgresql_where=text("is_active = true")),
    )


class BillingPlanConfigPlan(Base):
    """Individual plan within a config version."""

    __tablename__ = "billing_plan_config_plans"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("billing_plan_configs.id", ondelete="CASCADE"), nullable=False)
    code: Mapped[str] = mapped_column(String(30), nullable=False)
    name: Mapped[str] = mapped_column(String(60), nullable=False)
    price_usd: Mapped[str] = mapped_column(String(10), nullable=False)
    included_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    stripe_price_id: Mapped[str | None] = mapped_column(Text, nullable=True)
    requires_credit_card: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    limited: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("false"))
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, server_default=text("0"))
    description: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))
    icon: Mapped[str] = mapped_column(Text, nullable=False, server_default=text("''"))

    __table_args__ = (
        UniqueConstraint("config_id", "code", name="uq_billing_plan_config_plans_code"),
    )


class BillingPlanConfigRule(Base):
    """Upgrade rule within a config version."""

    __tablename__ = "billing_plan_config_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    config_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("billing_plan_configs.id", ondelete="CASCADE"), nullable=False)
    from_plan: Mapped[str] = mapped_column(String(30), nullable=False)
    to_plan: Mapped[str] = mapped_column(String(30), nullable=False)
    trigger: Mapped[str] = mapped_column(String(30), nullable=False, server_default="minutes_exceeded")

    __table_args__ = (
        UniqueConstraint("config_id", "from_plan", name="uq_billing_plan_config_rules_from"),
    )

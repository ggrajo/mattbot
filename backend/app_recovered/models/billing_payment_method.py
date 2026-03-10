import datetime
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BillingPaymentMethod(Base):
    __tablename__ = "billing_payment_methods"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    stripe_payment_method_id: Mapped[str | None] = mapped_column(Text, unique=True)
    brand: Mapped[str | None] = mapped_column(Text)
    last4: Mapped[str | None] = mapped_column(Text)
    exp_month: Mapped[int | None] = mapped_column(Integer)
    exp_year: Mapped[int | None] = mapped_column(Integer)
    is_default: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=text("true"))
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    user: Mapped["User | None"] = relationship("User", back_populates="billing_payment_methods", uselist=False)

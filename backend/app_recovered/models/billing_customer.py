import datetime
import uuid

from sqlalchemy import DateTime, ForeignKey, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class BillingCustomer(Base):
    __tablename__ = "billing_customers"

    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    stripe_customer_id: Mapped[str | None] = mapped_column(Text, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    user: Mapped["User | None"] = relationship("User", back_populates="billing_customer", uselist=False)

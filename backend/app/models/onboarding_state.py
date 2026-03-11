import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models._types import JsonbDict


class OnboardingState(Base):
    __tablename__ = "onboarding_state"

    owner_user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), primary_key=True
    )
    current_step: Mapped[str] = mapped_column(
        String(40), nullable=False, server_default="privacy_review"
    )
    steps_completed: Mapped[str] = mapped_column(JsonbDict, nullable=False, server_default="[]")
    completed_at: Mapped[datetime | None] = mapped_column(DateTime)
    updated_by_device_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("devices.id", ondelete="SET NULL")
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, nullable=False, server_default=text("now()")
    )

    user: Mapped["User | None"] = relationship("User", back_populates="onboarding", uselist=False)

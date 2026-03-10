from datetime import UTC
import datetime
import uuid

from sqlalchemy import Boolean, CheckConstraint, DateTime, Index, String, Text, text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    email: Mapped[str | None] = mapped_column(Text, unique=True)
    email_verified: Mapped[bool] = mapped_column(Boolean, nullable=False)
    password_hash: Mapped[str | None] = mapped_column(String(255))
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    display_name: Mapped[str | None] = mapped_column(Text)
    nickname: Mapped[str | None] = mapped_column(Text)
    company_name: Mapped[str | None] = mapped_column(Text)
    role_title: Mapped[str | None] = mapped_column(Text)
    ai_greeting_instructions: Mapped[str | None] = mapped_column(Text)
    default_timezone: Mapped[str] = mapped_column(Text, nullable=False)
    language_code: Mapped[str] = mapped_column(String(10), nullable=False)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime)
    created_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))
    updated_at: Mapped[datetime] = mapped_column(DateTime, nullable=False, server_default=text("now()"))

    agents: Mapped[list["Agent"]] = relationship("Agent", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")
    auth_identities: Mapped[list["AuthIdentity"]] = relationship("AuthIdentity", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")
    devices: Mapped[list["Device"]] = relationship("Device", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")
    sessions: Mapped[list["Session"]] = relationship("Session", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")
    mfa_methods: Mapped[list["MfaMethod"]] = relationship("MfaMethod", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")
    recovery_codes: Mapped[list["RecoveryCode"]] = relationship("RecoveryCode", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")
    audit_events: Mapped[list["AuditEvent"]] = relationship("AuditEvent", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")
    settings: Mapped["UserSettings | None"] = relationship("UserSettings", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update", uselist=False)
    onboarding: Mapped["OnboardingState | None"] = relationship("OnboardingState", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update", uselist=False)
    billing_customer: Mapped["BillingCustomer | None"] = relationship("BillingCustomer", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update", uselist=False)
    billing_subscription: Mapped["BillingSubscription | None"] = relationship("BillingSubscription", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update", uselist=False)
    billing_payment_methods: Mapped[list["BillingPaymentMethod"]] = relationship("BillingPaymentMethod", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")
    billing_usage: Mapped["BillingUsage | None"] = relationship("BillingUsage", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update", uselist=False)
    user_number: Mapped["UserNumber | None"] = relationship("UserNumber", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update", uselist=False)
    call_mode_config: Mapped["CallModeConfig | None"] = relationship("CallModeConfig", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update", uselist=False)
    forwarding_verification_attempts: Mapped[list["ForwardingVerificationAttempt"]] = relationship("ForwardingVerificationAttempt", back_populates="user", cascade="delete,delete-orphan,expunge,merge,refresh-expire,save-update")

    __table_args__ = (CheckConstraint("status IN ('active', 'pending_verification', 'locked', 'deleted')", name="ck_users_status"), CheckConstraint("(status = 'deleted' AND deleted_at IS NOT NULL) OR (status != 'deleted' AND deleted_at IS NULL)", name="ck_users_deleted_consistency"), Index("users_status_idx", "status"),)

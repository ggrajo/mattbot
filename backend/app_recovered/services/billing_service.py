# Source Generated with Decompyle++
# File: billing_service.pyc (Python 3.13)

__doc__ = 'Billing service with Stripe (prod) and Manual (dev/local) providers.'
from __future__ import annotations
import logging
import uuid
from datetime import UTC, datetime, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings as app_settings
from app.models.billing_customer import BillingCustomer
from app.models.billing_event import BillingEvent
from app.models.billing_payment_method import BillingPaymentMethod
from app.models.billing_subscription import BillingSubscription
from app.models.billing_usage import BillingUsage
from app.models.call_usage_event import CallUsageEvent
from app.schemas.billing import BillingStatusResponse, CancelResponse, ChangePlanResponse, PaymentMethodInfo, PaymentMethodResponse, SetupIntentResponse, SubscribeResponse
from app.services import audit_service
from app.services.billing_config_service import get_billing_config
logger = None(__name__)
_REDACTED_KEYS = {
    'cvc',
    'exp',
    'card',
    'number',
    'client_secret'}
# WARNING: Decompyle incomplete

"""Billing service – Stripe or manual provider."""

from __future__ import annotations

import json
import logging
import uuid
from datetime import UTC, datetime, timedelta

import stripe
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.middleware.error_handler import AppError
from app.models.billing_customer import BillingCustomer
from app.models.billing_event import BillingEvent
from app.models.billing_payment_method import BillingPaymentMethod
from app.models.billing_subscription import BillingSubscription
from app.models.billing_usage import BillingUsage
from app.services.billing_config_service import get_billing_config, get_minutes_for_plan

logger = logging.getLogger(__name__)


class BillingService:
    """Handles customer lifecycle, subscriptions, usage tracking, and webhooks."""

    # ------------------------------------------------------------------
    # Customer
    # ------------------------------------------------------------------

    async def get_or_create_customer(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> BillingCustomer:
        result = await db.execute(
            select(BillingCustomer).where(BillingCustomer.user_id == user_id)
        )
        customer = result.scalars().first()
        if customer:
            return customer

        provider = settings.BILLING_PROVIDER
        stripe_customer_id: str | None = None

        if provider == "stripe" and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            sc = stripe.Customer.create(metadata={"user_id": str(user_id)})
            stripe_customer_id = sc["id"]
        else:
            stripe_customer_id = f"cus_manual_{user_id.hex[:16]}"

        customer = BillingCustomer(
            user_id=user_id,
            stripe_customer_id=stripe_customer_id,
            billing_provider=provider,
        )
        db.add(customer)
        await db.flush()
        return customer

    # ------------------------------------------------------------------
    # Setup intent
    # ------------------------------------------------------------------

    async def create_setup_intent(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> dict:
        customer = await self.get_or_create_customer(db, user_id)

        if settings.BILLING_PROVIDER == "stripe" and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            intent = stripe.SetupIntent.create(
                customer=customer.stripe_customer_id,
                payment_method_types=["card"],
            )
            return {
                "client_secret": intent["client_secret"],
                "customer_id": customer.stripe_customer_id,
            }

        return {
            "client_secret": f"seti_manual_{user_id.hex[:16]}",
            "customer_id": customer.stripe_customer_id,
        }

    # ------------------------------------------------------------------
    # Payment methods
    # ------------------------------------------------------------------

    async def attach_payment_method(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        payment_method_id: str,
    ) -> BillingPaymentMethod:
        customer = await self.get_or_create_customer(db, user_id)

        brand: str | None = None
        last4: str | None = None
        exp_month: int | None = None
        exp_year: int | None = None

        if settings.BILLING_PROVIDER == "stripe" and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            stripe.PaymentMethod.attach(
                payment_method_id, customer=customer.stripe_customer_id
            )
            stripe.Customer.modify(
                customer.stripe_customer_id,
                invoice_settings={"default_payment_method": payment_method_id},
            )
            pm = stripe.PaymentMethod.retrieve(payment_method_id)
            card = pm.get("card", {})
            brand = card.get("brand")
            last4 = card.get("last4")
            exp_month = card.get("exp_month")
            exp_year = card.get("exp_year")
        else:
            brand = "mock"
            last4 = "4242"
            exp_month = 12
            exp_year = 2030

        # Mark existing methods as non-default
        result = await db.execute(
            select(BillingPaymentMethod).where(
                BillingPaymentMethod.user_id == user_id,
                BillingPaymentMethod.is_default.is_(True),
            )
        )
        for existing in result.scalars().all():
            existing.is_default = False

        method = BillingPaymentMethod(
            user_id=user_id,
            stripe_payment_method_id=payment_method_id,
            brand=brand,
            last4=last4,
            exp_month=exp_month,
            exp_year=exp_year,
            is_default=True,
        )
        db.add(method)
        await db.flush()
        return method

    # ------------------------------------------------------------------
    # Subscriptions
    # ------------------------------------------------------------------

    async def subscribe(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        plan: str,
        payment_method_id: str | None = None,
    ) -> BillingSubscription:
        config = get_billing_config()
        if plan not in config.valid_plan_codes():
            raise AppError("INVALID_PLAN", f"Unknown plan: {plan}", 422)

        minutes = get_minutes_for_plan(plan)
        customer = await self.get_or_create_customer(db, user_id)

        result = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.user_id == user_id
            )
        )
        existing = result.scalars().first()

        now = datetime.now(UTC)
        period_end = now + timedelta(days=settings.BILLING_PERIOD_DAYS)
        stripe_sub_id: str | None = None
        stripe_price_id: str | None = None

        if settings.BILLING_PROVIDER == "stripe" and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            price_map = config.get_stripe_price_map()
            stripe_price_id = price_map.get(plan)

            if existing and existing.stripe_subscription_id:
                sub = stripe.Subscription.retrieve(existing.stripe_subscription_id)
                stripe.Subscription.modify(
                    existing.stripe_subscription_id,
                    items=[{
                        "id": sub["items"]["data"][0]["id"],
                        "price": stripe_price_id,
                    }],
                )
                stripe_sub_id = existing.stripe_subscription_id
            else:
                sub = stripe.Subscription.create(
                    customer=customer.stripe_customer_id,
                    items=[{"price": stripe_price_id}],
                    default_payment_method=payment_method_id,
                )
                stripe_sub_id = sub["id"]
                period_end = datetime.fromtimestamp(
                    sub["current_period_end"], tz=UTC
                )
        else:
            stripe_sub_id = None

        if existing:
            existing.plan = plan
            existing.status = "active"
            existing.minutes_included = minutes
            existing.current_period_start = now
            existing.current_period_end = period_end
            existing.cancel_at_period_end = False
            existing.stripe_subscription_id = stripe_sub_id
            existing.stripe_price_id = stripe_price_id
            await db.flush()
            return existing

        subscription = BillingSubscription(
            user_id=user_id,
            plan=plan,
            status="active",
            stripe_subscription_id=stripe_sub_id,
            stripe_price_id=stripe_price_id,
            current_period_start=now,
            current_period_end=period_end,
            minutes_included=minutes,
        )
        db.add(subscription)
        await db.flush()
        return subscription

    # ------------------------------------------------------------------
    # Status
    # ------------------------------------------------------------------

    async def get_billing_status(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> dict:
        sub_result = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.user_id == user_id
            )
        )
        subscription = sub_result.scalars().first()

        usage_result = await db.execute(
            select(BillingUsage).where(BillingUsage.user_id == user_id)
        )
        usage = usage_result.scalars().first()

        pm_result = await db.execute(
            select(BillingPaymentMethod).where(
                BillingPaymentMethod.user_id == user_id,
                BillingPaymentMethod.is_default.is_(True),
            )
        )
        payment_method = pm_result.scalars().first()

        minutes_used = usage.minutes_used if usage else 0
        has_sub = subscription is not None
        plan = subscription.plan if subscription else None
        minutes_included = subscription.minutes_included if subscription else 0
        minutes_remaining = max(0, minutes_included - minutes_used) if has_sub else 0

        return {
            "has_subscription": has_sub,
            "plan": plan,
            "status": subscription.status if subscription else None,
            "minutes_used": minutes_used,
            "minutes_included": minutes_included,
            "minutes_remaining": minutes_remaining,
            "cancel_at_period_end": (
                subscription.cancel_at_period_end if subscription else False
            ),
            "current_period_start": (
                subscription.current_period_start.isoformat()
                if subscription and subscription.current_period_start
                else None
            ),
            "current_period_end": (
                subscription.current_period_end.isoformat()
                if subscription and subscription.current_period_end
                else None
            ),
            "payment_method": {
                "brand": payment_method.brand,
                "last4": payment_method.last4,
                "exp_month": payment_method.exp_month,
                "exp_year": payment_method.exp_year,
            }
            if payment_method
            else None,
        }

    # ------------------------------------------------------------------
    # Plan changes
    # ------------------------------------------------------------------

    async def change_plan(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        new_plan: str,
    ) -> BillingSubscription:
        config = get_billing_config()
        if new_plan not in config.valid_plan_codes():
            raise AppError("INVALID_PLAN", f"Unknown plan: {new_plan}", 422)

        result = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.user_id == user_id
            )
        )
        subscription = result.scalars().first()
        if not subscription:
            raise AppError(
                "NO_SUBSCRIPTION",
                "No active subscription to change",
                404,
            )

        minutes = get_minutes_for_plan(new_plan)
        now = datetime.now(UTC)

        if settings.BILLING_PROVIDER == "stripe" and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            price_map = config.get_stripe_price_map()
            new_price = price_map.get(new_plan)
            if subscription.stripe_subscription_id:
                sub = stripe.Subscription.retrieve(
                    subscription.stripe_subscription_id
                )
                stripe.Subscription.modify(
                    subscription.stripe_subscription_id,
                    items=[{
                        "id": sub["items"]["data"][0]["id"],
                        "price": new_price,
                    }],
                    proration_behavior="create_prorations",
                )
                subscription.stripe_price_id = new_price

        subscription.plan = new_plan
        subscription.status = "active"
        subscription.minutes_included = minutes
        subscription.cancel_at_period_end = False
        subscription.current_period_start = now
        subscription.current_period_end = now + timedelta(
            days=settings.BILLING_PERIOD_DAYS
        )
        await db.flush()
        return subscription

    # ------------------------------------------------------------------
    # Cancellation
    # ------------------------------------------------------------------

    async def cancel_subscription(
        self,
        db: AsyncSession,
        user_id: uuid.UUID,
        immediate: bool = False,
    ) -> BillingSubscription:
        result = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.user_id == user_id
            )
        )
        subscription = result.scalars().first()
        if not subscription:
            raise AppError(
                "NO_SUBSCRIPTION", "No active subscription to cancel", 404
            )

        if settings.BILLING_PROVIDER == "stripe" and settings.STRIPE_SECRET_KEY:
            stripe.api_key = settings.STRIPE_SECRET_KEY
            if subscription.stripe_subscription_id:
                if immediate:
                    stripe.Subscription.cancel(
                        subscription.stripe_subscription_id
                    )
                else:
                    stripe.Subscription.modify(
                        subscription.stripe_subscription_id,
                        cancel_at_period_end=True,
                    )

        if immediate:
            subscription.status = "canceled"
            subscription.cancel_at_period_end = False
        else:
            subscription.cancel_at_period_end = True

        await db.flush()
        return subscription

    # ------------------------------------------------------------------
    # Billing gate for number provisioning
    # ------------------------------------------------------------------

    async def ensure_billing_active_for_number_provisioning(
        self, db: AsyncSession, user_id: uuid.UUID
    ) -> None:
        result = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.user_id == user_id,
                BillingSubscription.status == "active",
            )
        )
        subscription = result.scalars().first()
        if not subscription:
            raise AppError(
                "BILLING_REQUIRED",
                "An active billing subscription is required to provision a number",
                403,
            )

    # ------------------------------------------------------------------
    # Usage tracking
    # ------------------------------------------------------------------

    async def record_usage_minutes(
        self, db: AsyncSession, user_id: uuid.UUID, minutes: int
    ) -> dict:
        result = await db.execute(
            select(BillingUsage).where(BillingUsage.user_id == user_id)
        )
        usage = result.scalars().first()

        if not usage:
            usage = BillingUsage(user_id=user_id, minutes_used=0)
            db.add(usage)
            await db.flush()

        usage.minutes_used += minutes
        await db.flush()

        upgrade_triggered = False

        sub_result = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.user_id == user_id
            )
        )
        subscription = sub_result.scalars().first()

        if subscription and subscription.plan:
            config = get_billing_config()
            rule = config.get_overage_upgrade(subscription.plan)
            plan_minutes = get_minutes_for_plan(subscription.plan)
            if rule and usage.minutes_used > plan_minutes:
                new_minutes = get_minutes_for_plan(rule.to_plan)
                subscription.plan = rule.to_plan
                subscription.minutes_included = new_minutes
                subscription.current_period_start = datetime.now(UTC)
                subscription.current_period_end = datetime.now(UTC) + timedelta(
                    days=settings.BILLING_PERIOD_DAYS
                )
                upgrade_triggered = True
                await db.flush()
                logger.info(
                    "Auto-upgraded user %s from %s to %s",
                    user_id,
                    rule.from_plan,
                    rule.to_plan,
                )

        return {
            "minutes_used": usage.minutes_used,
            "upgrade_triggered": upgrade_triggered,
        }

    # ------------------------------------------------------------------
    # Stripe webhook handling
    # ------------------------------------------------------------------

    async def handle_stripe_webhook(
        self,
        db: AsyncSession,
        payload: bytes,
        signature: str,
    ) -> dict:
        if settings.BILLING_PROVIDER != "stripe":
            raise AppError("WEBHOOK_DISABLED", "Stripe webhooks not enabled", 400)

        stripe.api_key = settings.STRIPE_SECRET_KEY
        try:
            event = stripe.Webhook.construct_event(
                payload, signature, settings.STRIPE_WEBHOOK_SECRET
            )
        except stripe.error.SignatureVerificationError:
            raise AppError("INVALID_SIGNATURE", "Invalid webhook signature", 400)

        event_type = event["type"]
        data_object = event["data"]["object"]

        billing_event = BillingEvent(
            event_type=event_type,
            stripe_event_id=event.get("id"),
            payload=json.dumps(data_object),
        )
        db.add(billing_event)

        if event_type == "customer.subscription.updated":
            await self._handle_subscription_updated(db, data_object)
        elif event_type == "customer.subscription.deleted":
            await self._handle_subscription_deleted(db, data_object)
        elif event_type == "invoice.payment_failed":
            await self._handle_payment_failed(db, data_object)

        await db.flush()
        return {"status": "processed", "type": event_type}

    async def _handle_subscription_updated(
        self, db: AsyncSession, data: dict
    ) -> None:
        stripe_sub_id = data.get("id")
        if not stripe_sub_id:
            return
        result = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.stripe_subscription_id == stripe_sub_id
            )
        )
        subscription = result.scalars().first()
        if not subscription:
            return

        status = data.get("status", "active")
        status_map = {
            "active": "active",
            "past_due": "past_due",
            "canceled": "canceled",
            "incomplete": "incomplete",
        }
        subscription.status = status_map.get(status, "active")
        subscription.cancel_at_period_end = data.get(
            "cancel_at_period_end", False
        )

        period_end = data.get("current_period_end")
        if period_end:
            subscription.current_period_end = datetime.fromtimestamp(
                period_end, tz=UTC
            )

    async def _handle_subscription_deleted(
        self, db: AsyncSession, data: dict
    ) -> None:
        stripe_sub_id = data.get("id")
        if not stripe_sub_id:
            return
        result = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.stripe_subscription_id == stripe_sub_id
            )
        )
        subscription = result.scalars().first()
        if subscription:
            subscription.status = "canceled"

    async def _handle_payment_failed(
        self, db: AsyncSession, data: dict
    ) -> None:
        stripe_sub_id = data.get("subscription")
        if not stripe_sub_id:
            return
        result = await db.execute(
            select(BillingSubscription).where(
                BillingSubscription.stripe_subscription_id == stripe_sub_id
            )
        )
        subscription = result.scalars().first()
        if subscription:
            subscription.status = "past_due"


billing_service = BillingService()

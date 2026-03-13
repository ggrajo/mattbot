"""Billing service with Stripe (prod) and Manual (dev/local) providers."""

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
from app.schemas.billing import (
    BillingStatusResponse,
    CancelResponse,
    ChangePlanResponse,
    PaymentMethodInfo,
    PaymentMethodResponse,
    SetupIntentResponse,
    SubscribeResponse,
)
from app.services import audit_service
from app.services.billing_config_service import get_billing_config
from app.core.clock import utcnow

logger = logging.getLogger(__name__)

_REDACTED_KEYS = frozenset({"client_secret", "exp", "number", "cvc", "card"})


def _redact_payload(payload: dict) -> dict:
    """Strip sensitive fields from a webhook payload before storing."""
    redacted = {}
    for k, v in payload.items():
        if any(s in k.lower() for s in _REDACTED_KEYS):
            redacted[k] = "***REDACTED***"
        elif isinstance(v, dict):
            redacted[k] = _redact_payload(v)
        else:
            redacted[k] = v
    return redacted


def _mask_phone(e164: str) -> str:
    if len(e164) > 4:
        return "***" + e164[-4:]
    return "***"


async def _get_or_create_customer(db: AsyncSession, user_id: uuid.UUID) -> BillingCustomer:
    customer = await db.get(BillingCustomer, user_id)
    if customer is None:
        customer = BillingCustomer(owner_user_id=user_id)
        db.add(customer)
        await db.flush()
        await db.refresh(customer)
    return customer


async def _get_usage(db: AsyncSession, user_id: uuid.UUID) -> BillingUsage:
    usage = await db.get(BillingUsage, user_id)
    if usage is None:
        usage = BillingUsage(owner_user_id=user_id)
        db.add(usage)
        await db.flush()
        await db.refresh(usage)
    return usage


async def _get_default_payment_method(
    db: AsyncSession, user_id: uuid.UUID
) -> BillingPaymentMethod | None:
    stmt = (
        select(BillingPaymentMethod)
        .where(
            BillingPaymentMethod.owner_user_id == user_id,
            BillingPaymentMethod.is_default.is_(True),
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def get_billing_status(db: AsyncSession, user_id: uuid.UUID) -> BillingStatusResponse:
    sub = await _get_subscription(db, user_id)
    usage = await _get_usage(db, user_id)
    pm = await _get_default_payment_method(db, user_id)

    if sub is None:
        return BillingStatusResponse(
            minutes_used=usage.minutes_used,
            has_subscription=False,
            payment_method=PaymentMethodInfo(
                brand=pm.brand,
                last4=pm.last4,
                exp_month=pm.exp_month,
                exp_year=pm.exp_year,
            )
            if pm
            else None,
        )

    carried = sub.minutes_carried_over
    minutes_remaining = max(0, sub.minutes_included + carried - usage.minutes_used)

    return BillingStatusResponse(
        plan=sub.plan,
        status=sub.status,
        minutes_included=sub.minutes_included,
        minutes_used=usage.minutes_used,
        minutes_remaining=minutes_remaining,
        minutes_carried_over=carried,
        payment_method=PaymentMethodInfo(
            brand=pm.brand,
            last4=pm.last4,
            exp_month=pm.exp_month,
            exp_year=pm.exp_year,
        )
        if pm
        else None,
        current_period_end=sub.current_period_end,
        cancel_at_period_end=sub.cancel_at_period_end,
        has_subscription=True,
    )


async def _get_subscription(db: AsyncSession, user_id: uuid.UUID) -> BillingSubscription | None:
    stmt = select(BillingSubscription).where(
        BillingSubscription.owner_user_id == user_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_setup_intent(db: AsyncSession, user_id: uuid.UUID) -> SetupIntentResponse:
    customer = await _get_or_create_customer(db, user_id)

    if app_settings.BILLING_PROVIDER == "stripe":
        import stripe

        stripe.api_key = app_settings.STRIPE_SECRET_KEY

        if not customer.stripe_customer_id:
            sc = stripe.Customer.create(metadata={"mattbot_user_id": str(user_id)})
            customer.stripe_customer_id = sc.id
            await db.flush()

        si = stripe.SetupIntent.create(
            customer=customer.stripe_customer_id,
            payment_method_types=["card"],
        )

        return SetupIntentResponse(
            client_secret=si.client_secret,
            customer_id=customer.stripe_customer_id,
        )

    fake_customer_id = customer.stripe_customer_id or f"cus_manual_{user_id.hex[:12]}"
    if not customer.stripe_customer_id:
        customer.stripe_customer_id = fake_customer_id
        await db.flush()

    return SetupIntentResponse(
        client_secret=f"seti_manual_{uuid.uuid4().hex}_secret_manual",
        customer_id=fake_customer_id,
    )


async def subscribe(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan: str,
    payment_method_id: str,
) -> SubscribeResponse:
    from app.middleware.error_handler import AppError

    existing = await _get_subscription(db, user_id)
    if existing and existing.status == "active":
        if existing.plan == plan:
            now_renew = utcnow()
            existing.current_period_start = now_renew
            existing.current_period_end = now_renew + timedelta(days=app_settings.BILLING_PERIOD_DAYS)
            existing.cancel_at_period_end = False
            existing.canceled_at = None
            await db.flush()
            await db.refresh(existing)
            return SubscribeResponse(
                plan=existing.plan,
                status=existing.status,
                minutes_included=existing.minutes_included,
                current_period_end=existing.current_period_end,
            )
        raise AppError(
            "ALREADY_SUBSCRIBED",
            "You already have an active subscription. Use change-plan instead.",
            409,
        )

    config = get_billing_config()
    plan_cfg = config.get_plan(plan)

    if plan_cfg.limited and existing is not None:
        raise AppError(
            "PLAN_NOT_AVAILABLE",
            "This plan is only available during initial setup.",
            400,
        )

    minutes = plan_cfg.included_minutes
    now = utcnow()

    pm = await _get_default_payment_method(db, user_id)
    if pm is None:
        dev_pm_id = (
            f"{payment_method_id}_{user_id.hex[:12]}"
            if app_settings.BILLING_PROVIDER != "stripe"
            else payment_method_id
        )

        pm = BillingPaymentMethod(
            owner_user_id=user_id,
            stripe_payment_method_id=dev_pm_id,
            brand="card",
            last4="4242",
            is_default=True,
        )
        db.add(pm)

    if app_settings.BILLING_PROVIDER == "stripe":
        import stripe

        stripe.api_key = app_settings.STRIPE_SECRET_KEY

        customer = await _get_or_create_customer(db, user_id)
        cust_id = customer.stripe_customer_id or ""
        stripe.PaymentMethod.attach(payment_method_id, customer=cust_id)
        stripe.Customer.modify(
            cust_id,
            invoice_settings={"default_payment_method": payment_method_id},
        )

        price_map = config.get_stripe_price_map()
        stripe_sub = stripe.Subscription.create(
            customer=cust_id,
            items=[{"price": price_map[plan]}],
            metadata={"mattbot_user_id": str(user_id), "plan": plan},
        )

        try:
            spm = stripe.PaymentMethod.retrieve(payment_method_id)
            pm.brand = spm.card.brand if spm.card else "card"
            pm.last4 = spm.card.last4 if spm.card else None
            pm.exp_month = spm.card.exp_month if spm.card else None
            pm.exp_year = spm.card.exp_year if spm.card else None
        except Exception:
            logger.debug("Failed to retrieve Stripe PM details", exc_info=True)

        sub = BillingSubscription(
            owner_user_id=user_id,
            plan=plan,
            status=stripe_sub.status,
            stripe_subscription_id=stripe_sub.id,
            stripe_price_id=price_map[plan],
            current_period_start=datetime.fromtimestamp(
                getattr(stripe_sub, "current_period_start", 0),
                tz=UTC,
            ),
            current_period_end=datetime.fromtimestamp(
                getattr(stripe_sub, "current_period_end", 0),
                tz=UTC,
            ),
            minutes_included=minutes,
        )
    else:
        period_end = now + timedelta(days=app_settings.BILLING_PERIOD_DAYS)
        if existing and existing.status in ("canceled", "incomplete"):
            existing.plan = plan
            existing.status = "active"
            existing.minutes_included = minutes
            existing.cancel_at_period_end = False
            existing.canceled_at = None
            existing.current_period_start = now
            existing.current_period_end = period_end
            sub = existing
        else:
            sub = BillingSubscription(
                owner_user_id=user_id,
                plan=plan,
                status="active",
                minutes_included=minutes,
                current_period_start=now,
                current_period_end=period_end,
            )

    if not existing or existing.id != getattr(sub, "id", None):
        db.add(sub)

    await audit_service.log_event(
        db=db,
        owner_user_id=user_id,
        event_type="SUBSCRIPTION_CREATED",
        details={"plan": plan, "status": "active"},
    )

    await audit_service.log_event(
        db=db,
        owner_user_id=user_id,
        event_type="PAYMENT_METHOD_ADDED",
        details={"brand": pm.brand, "last4": pm.last4},
    )

    await db.flush()
    await db.refresh(sub)

    return SubscribeResponse(
        plan=sub.plan,
        status=sub.status,
        minutes_included=sub.minutes_included,
        current_period_end=sub.current_period_end,
    )


async def change_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    new_plan: str,
) -> ChangePlanResponse:
    from app.middleware.error_handler import AppError

    config = get_billing_config()
    plan_cfg = config.get_plan(new_plan)
    new_minutes = plan_cfg.included_minutes

    if plan_cfg.limited:
        raise AppError(
            "PLAN_NOT_AVAILABLE",
            "This plan is only available during initial setup.",
            400,
        )

    sub = await _get_subscription(db, user_id)

    if sub is None:
        pm = await _get_default_payment_method(db, user_id)
        if pm is None:
            raise AppError(
                "PAYMENT_METHOD_REQUIRED",
                "A payment method is required to upgrade from the free plan.",
                400,
            )

        now = utcnow()
        sub = BillingSubscription(
            owner_user_id=user_id,
            plan=new_plan,
            status="active",
            minutes_included=new_minutes,
            current_period_start=now,
            current_period_end=now + timedelta(days=app_settings.BILLING_PERIOD_DAYS),
        )
        db.add(sub)

        await audit_service.log_event(
            db=db,
            owner_user_id=user_id,
            event_type="SUBSCRIPTION_CREATED",
            details={"plan": new_plan, "reason": "free_tier_upgrade"},
        )

        await db.flush()
        await db.refresh(sub)

        return ChangePlanResponse(
            plan=sub.plan,
            status=sub.status,
            minutes_included=sub.minutes_included,
            current_period_end=sub.current_period_end,
        )

    if sub.status not in ("active", "past_due"):
        raise AppError(
            "NO_ACTIVE_SUBSCRIPTION",
            "No active subscription to change.",
            400,
        )

    if sub.plan == new_plan:
        raise AppError("SAME_PLAN", "You are already on this plan.", 400)

    old_plan = sub.plan
    now = utcnow()

    usage = await _get_usage(db, user_id)
    period_end = sub.current_period_end
    if period_end and period_end.tzinfo:
        period_end = period_end.replace(tzinfo=None)
    if period_end and now < period_end:
        carried = sub.minutes_carried_over
        remaining = max(0, sub.minutes_included + carried - usage.minutes_used)
        sub.minutes_carried_over = remaining
    else:
        sub.minutes_carried_over = 0

    if app_settings.BILLING_PROVIDER == "stripe" and sub.stripe_subscription_id:
        import stripe

        stripe.api_key = app_settings.STRIPE_SECRET_KEY

        price_map = config.get_stripe_price_map()
        stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            items=[
                {
                    "id": stripe_sub["items"]["data"][0]["id"],
                    "price": price_map[new_plan],
                }
            ],
            proration_behavior="create_prorations",
            metadata={"plan": new_plan},
        )
        sub.stripe_price_id = price_map[new_plan]

    sub.plan = new_plan
    sub.minutes_included = new_minutes
    sub.cancel_at_period_end = False
    sub.canceled_at = None

    if app_settings.BILLING_PROVIDER != "stripe":
        if sub.current_period_end is None or now >= sub.current_period_end:
            sub.current_period_start = now
            sub.current_period_end = now + timedelta(days=app_settings.BILLING_PERIOD_DAYS)

    await audit_service.log_event(
        db=db,
        owner_user_id=user_id,
        event_type="SUBSCRIPTION_UPDATED",
        details={
            "old_plan": old_plan,
            "new_plan": new_plan,
            "reason": "user_change",
        },
    )

    await db.flush()
    await db.refresh(sub)

    return ChangePlanResponse(
        plan=sub.plan,
        status=sub.status,
        minutes_included=sub.minutes_included,
        minutes_carried_over=sub.minutes_carried_over,
        current_period_end=sub.current_period_end,
    )


async def cancel_subscription(db: AsyncSession, user_id: uuid.UUID) -> CancelResponse:
    from app.middleware.error_handler import AppError

    sub = await _get_subscription(db, user_id)
    if sub is None or sub.status not in ("active", "past_due", "trialing"):
        raise AppError(
            "NO_ACTIVE_SUBSCRIPTION",
            "No active subscription to cancel.",
            400,
        )

    if app_settings.BILLING_PROVIDER == "stripe" and sub.stripe_subscription_id:
        import stripe

        stripe.api_key = app_settings.STRIPE_SECRET_KEY
        stripe.Subscription.modify(
            sub.stripe_subscription_id,
            cancel_at_period_end=True,
        )

    sub.cancel_at_period_end = True
    sub.canceled_at = utcnow()

    await audit_service.log_event(
        db=db,
        owner_user_id=user_id,
        event_type="SUBSCRIPTION_CANCELED",
        details={"effective_date": str(sub.current_period_end)},
    )

    from app.services import telephony_service

    await telephony_service.suspend_number(db, user_id, reason="subscription_canceled")

    await db.flush()
    await db.refresh(sub)

    return CancelResponse(
        status=sub.status,
        cancel_at_period_end=sub.cancel_at_period_end,
        current_period_end=sub.current_period_end,
    )


async def ensure_billing_active_for_provisioning(db: AsyncSession, user_id: uuid.UUID) -> None:
    from app.middleware.error_handler import AppError

    sub = await _get_subscription(db, user_id)
    if sub is None or sub.status != "active":
        raise AppError(
            "BILLING_REQUIRED",
            "An active subscription is required before provisioning a phone number.",
            403,
        )

    pm = await _get_default_payment_method(db, user_id)
    if pm is None:
        raise AppError(
            "PAYMENT_METHOD_REQUIRED",
            "A payment method must be on file before provisioning a phone number.",
            403,
        )


async def is_billing_active(db: AsyncSession, user_id: uuid.UUID) -> bool:
    """Return True if the user has an active subscription that allows streaming."""
    sub = await _get_subscription(db, user_id)
    return sub is not None and sub.status == "active"


async def record_usage(
    db: AsyncSession,
    user_id: uuid.UUID,
    minutes: int,
    source: str = "call",
    *,
    idempotency_key: str | None = None,
    call_id: uuid.UUID | None = None,
    duration_seconds: int | None = None,
) -> dict:
    """Record minute usage with idempotency. Returns dict with upgrade_triggered flag."""
    if idempotency_key:
        existing_event = (
            await db.execute(
                select(CallUsageEvent).where(
                    CallUsageEvent.idempotency_key == idempotency_key,
                )
            )
        ).scalar_one_or_none()

        if existing_event is not None:
            logger.debug(
                "Usage already recorded for key=%s, skipping",
                idempotency_key[:16],
            )
            usage = await _get_usage(db, user_id)
            return {
                "minutes_used": usage.minutes_used,
                "upgrade_triggered": False,
                "duplicate": True,
            }

    usage = await _get_usage(db, user_id)
    usage.minutes_used += minutes
    usage.last_usage_source = source
    usage.updated_at = utcnow()

    if idempotency_key:
        usage_event = CallUsageEvent(
            call_id=call_id,
            owner_user_id=user_id,
            idempotency_key=idempotency_key,
            minutes_billed=minutes,
            duration_seconds=duration_seconds or 0,
            source=source,
        )
        db.add(usage_event)

    upgrade_triggered = False
    sub = await _get_subscription(db, user_id)

    if sub and sub.status == "active":
        config = get_billing_config()
        rule = config.get_overage_upgrade(sub.plan)
        if rule:
            current_plan = config.get_plan(sub.plan)
            if usage.minutes_used > current_plan.included_minutes:
                target = config.get_plan(rule.to_plan)
                sub.plan = rule.to_plan
                sub.minutes_included = target.included_minutes

                if app_settings.BILLING_PROVIDER == "stripe" and sub.stripe_subscription_id:
                    import stripe

                    stripe.api_key = app_settings.STRIPE_SECRET_KEY
                    price_map = config.get_stripe_price_map()
                    stripe_sub = stripe.Subscription.retrieve(sub.stripe_subscription_id)
                    stripe.Subscription.modify(
                        sub.stripe_subscription_id,
                        items=[
                            {
                                "id": stripe_sub["items"]["data"][0]["id"],
                                "price": price_map[rule.to_plan],
                            }
                        ],
                        proration_behavior="create_prorations",
                        metadata={"plan": rule.to_plan},
                    )
                    sub.stripe_price_id = price_map[rule.to_plan]

                await audit_service.log_event(
                    db=db,
                    owner_user_id=user_id,
                    event_type="PLAN_OVERAGE_AUTO_UPGRADE",
                    details={
                        "from_plan": current_plan.code,
                        "to_plan": rule.to_plan,
                        "minutes_used": usage.minutes_used,
                        "threshold": current_plan.included_minutes,
                    },
                )

                upgrade_triggered = True
                logger.info(
                    "Auto-upgraded user %s from %s to %s (minutes_used=%d, threshold=%d)",
                    str(user_id)[:8],
                    current_plan.code,
                    rule.to_plan,
                    usage.minutes_used,
                    current_plan.included_minutes,
                )

    await db.flush()

    return {
        "minutes_used": usage.minutes_used,
        "upgrade_triggered": upgrade_triggered,
        "duplicate": False,
    }


async def list_payment_methods(db: AsyncSession, user_id: uuid.UUID) -> list[PaymentMethodResponse]:
    stmt = (
        select(BillingPaymentMethod)
        .where(BillingPaymentMethod.owner_user_id == user_id)
        .order_by(
            BillingPaymentMethod.is_default.desc(),
            BillingPaymentMethod.created_at.desc(),
        )
    )
    result = await db.execute(stmt)
    rows = result.scalars().all()

    return [
        PaymentMethodResponse(
            id=str(row.id),
            brand=row.brand,
            last4=row.last4,
            exp_month=row.exp_month,
            exp_year=row.exp_year,
            is_default=row.is_default,
            created_at=row.created_at,
        )
        for row in rows
    ]


async def add_payment_method(
    db: AsyncSession,
    user_id: uuid.UUID,
    payment_method_id: str,
    set_as_default: bool = True,
) -> PaymentMethodResponse:

    customer = await _get_or_create_customer(db, user_id)

    brand = "card"
    last4 = "4242"
    exp_month = None
    exp_year = None

    if app_settings.BILLING_PROVIDER == "stripe":
        import stripe

        stripe.api_key = app_settings.STRIPE_SECRET_KEY

        if not customer.stripe_customer_id:
            sc = stripe.Customer.create(metadata={"mattbot_user_id": str(user_id)})
            customer.stripe_customer_id = sc.id
            await db.flush()

        stripe.PaymentMethod.attach(payment_method_id, customer=customer.stripe_customer_id)

        try:
            spm = stripe.PaymentMethod.retrieve(payment_method_id)
            brand = spm.card.brand if spm.card else "card"
            last4 = spm.card.last4 if spm.card else "0000"
            exp_month = spm.card.exp_month if spm.card else None
            exp_year = spm.card.exp_year if spm.card else None
        except Exception:
            logger.debug("Failed to retrieve Stripe PM details", exc_info=True)
    else:
        payment_method_id = f"{payment_method_id}_{user_id.hex[:12]}"

    if set_as_default:
        await db.execute(
            select(BillingPaymentMethod).where(
                BillingPaymentMethod.owner_user_id == user_id,
            )
        )

        unset_stmt = select(BillingPaymentMethod).where(
            BillingPaymentMethod.owner_user_id == user_id,
            BillingPaymentMethod.is_default.is_(True),
        )

        existing_defaults = (await db.execute(unset_stmt)).scalars().all()
        for ed in existing_defaults:
            ed.is_default = False

        if app_settings.BILLING_PROVIDER == "stripe" and customer.stripe_customer_id:
            import stripe

            stripe.api_key = app_settings.STRIPE_SECRET_KEY
            stripe.Customer.modify(
                customer.stripe_customer_id,
                invoice_settings={
                    "default_payment_method": payment_method_id,
                },
            )

    pm = BillingPaymentMethod(
        owner_user_id=user_id,
        stripe_payment_method_id=payment_method_id,
        brand=brand,
        last4=last4,
        exp_month=exp_month,
        exp_year=exp_year,
        is_default=set_as_default,
    )
    db.add(pm)

    await audit_service.log_event(
        db=db,
        owner_user_id=user_id,
        event_type="PAYMENT_METHOD_ADDED",
        details={"brand": brand, "last4": last4},
    )

    await db.flush()
    await db.refresh(pm)

    return PaymentMethodResponse(
        id=str(pm.id),
        brand=pm.brand,
        last4=pm.last4,
        exp_month=pm.exp_month,
        exp_year=pm.exp_year,
        is_default=pm.is_default,
        created_at=pm.created_at,
    )


async def remove_payment_method(db: AsyncSession, user_id: uuid.UUID, pm_id: uuid.UUID) -> None:
    from app.middleware.error_handler import AppError

    pm = await db.get(BillingPaymentMethod, pm_id)
    if pm is None or pm.owner_user_id != user_id:
        raise AppError("NOT_FOUND", "Payment method not found.", 404)

    count_stmt = select(BillingPaymentMethod).where(
        BillingPaymentMethod.owner_user_id == user_id,
    )
    all_pms = (await db.execute(count_stmt)).scalars().all()

    if len(all_pms) <= 1:
        sub = await _get_subscription(db, user_id)
        if sub and sub.status == "active":
            raise AppError(
                "CANNOT_DELETE_LAST",
                "Cannot remove the only payment method while you have an active subscription.",
                400,
            )

    if app_settings.BILLING_PROVIDER == "stripe" and pm.stripe_payment_method_id:
        try:
            import stripe

            stripe.api_key = app_settings.STRIPE_SECRET_KEY
            stripe.PaymentMethod.detach(pm.stripe_payment_method_id)
        except Exception:
            logger.debug("Failed to detach Stripe PM", exc_info=True)

    was_default = pm.is_default
    await db.delete(pm)

    if was_default and len(all_pms) > 1:
        remaining = [p for p in all_pms if p.id != pm_id]
        if remaining:
            remaining[0].is_default = True
            if app_settings.BILLING_PROVIDER == "stripe":
                customer = await _get_or_create_customer(db, user_id)
                if customer.stripe_customer_id and remaining[0].stripe_payment_method_id:
                    try:
                        import stripe

                        stripe.api_key = app_settings.STRIPE_SECRET_KEY
                        stripe.Customer.modify(
                            customer.stripe_customer_id,
                            invoice_settings={
                                "default_payment_method": remaining[0].stripe_payment_method_id,
                            },
                        )
                    except Exception:
                        logger.debug(
                            "Failed to update Stripe default PM",
                            exc_info=True,
                        )

    await audit_service.log_event(
        db=db,
        owner_user_id=user_id,
        event_type="PAYMENT_METHOD_REMOVED",
        details={"pm_id": str(pm_id)},
    )

    await db.flush()


async def set_default_payment_method(
    db: AsyncSession, user_id: uuid.UUID, pm_id: uuid.UUID
) -> None:
    from app.middleware.error_handler import AppError

    pm = await db.get(BillingPaymentMethod, pm_id)
    if pm is None or pm.owner_user_id != user_id:
        raise AppError("NOT_FOUND", "Payment method not found.", 404)

    if pm.is_default:
        return

    unset_stmt = select(BillingPaymentMethod).where(
        BillingPaymentMethod.owner_user_id == user_id,
        BillingPaymentMethod.is_default.is_(True),
    )

    existing_defaults = (await db.execute(unset_stmt)).scalars().all()
    for ed in existing_defaults:
        ed.is_default = False

    pm.is_default = True

    if app_settings.BILLING_PROVIDER == "stripe" and pm.stripe_payment_method_id:
        customer = await _get_or_create_customer(db, user_id)
        if customer.stripe_customer_id:
            try:
                import stripe

                stripe.api_key = app_settings.STRIPE_SECRET_KEY
                stripe.Customer.modify(
                    customer.stripe_customer_id,
                    invoice_settings={
                        "default_payment_method": pm.stripe_payment_method_id,
                    },
                )
            except Exception:
                logger.debug("Failed to update Stripe default PM", exc_info=True)

    await audit_service.log_event(
        db=db,
        owner_user_id=user_id,
        event_type="PAYMENT_METHOD_DEFAULT_CHANGED",
        details={"pm_id": str(pm_id)},
    )

    await db.flush()


async def dev_set_plan(
    db: AsyncSession,
    user_id: uuid.UUID,
    plan: str,
    status: str = "active",
) -> SubscribeResponse:
    config = get_billing_config()
    minutes = config.get_plan(plan).included_minutes
    now = utcnow()

    period_end = now + timedelta(days=app_settings.BILLING_PERIOD_DAYS)
    sub = await _get_subscription(db, user_id)
    if sub is None:
        sub = BillingSubscription(
            owner_user_id=user_id,
            plan=plan,
            status=status,
            minutes_included=minutes,
            current_period_start=now,
            current_period_end=period_end,
        )
        db.add(sub)
    else:
        sub.plan = plan
        sub.status = status
        sub.minutes_included = minutes
        sub.cancel_at_period_end = False
        sub.canceled_at = None
        sub.current_period_start = now
        sub.current_period_end = period_end

    pm = await _get_default_payment_method(db, user_id)
    if pm is None:
        pm = BillingPaymentMethod(
            owner_user_id=user_id,
            stripe_payment_method_id=f"pm_dev_{uuid.uuid4().hex[:12]}",
            brand="visa",
            last4="4242",
            is_default=True,
        )
        db.add(pm)

    await _get_or_create_customer(db, user_id)

    await db.flush()
    await db.refresh(sub)

    return SubscribeResponse(
        plan=sub.plan,
        status=sub.status,
        minutes_included=sub.minutes_included,
        current_period_end=sub.current_period_end,
    )


async def handle_stripe_webhook(db: AsyncSession, payload: bytes, sig_header: str) -> dict:
    """Process a Stripe webhook event. Returns processing result."""
    import stripe

    stripe.api_key = app_settings.STRIPE_SECRET_KEY

    try:
        event = stripe.Webhook.construct_event(
            payload,
            sig_header,
            app_settings.STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        return {"status": "invalid_signature"}
    except Exception as e:
        logger.error("Stripe webhook parse error: %s", str(e)[:100])
        return {"status": "parse_error"}

    existing = await db.execute(
        select(BillingEvent).where(
            BillingEvent.provider_event_id == event.id,
        )
    )

    if existing.scalar_one_or_none():
        return {"status": "duplicate"}

    be = BillingEvent(
        provider_event_id=event.id,
        event_type=event.type,
        payload_redacted=_redact_payload(event.data.to_dict()) if event.data else None,
    )
    db.add(be)

    handled = False
    event_type = event.type

    from app.services import telephony_service

    if event_type in (
        "customer.subscription.updated",
        "customer.subscription.created",
    ):
        stripe_sub = event.data.object
        sub_id = stripe_sub.id
        stmt = select(BillingSubscription).where(
            BillingSubscription.stripe_subscription_id == sub_id,
        )
        result = await db.execute(stmt)
        sub = result.scalar_one_or_none()
        if sub:
            old_status = sub.status
            sub.status = stripe_sub.status
            if stripe_sub.cancel_at_period_end is not None:
                sub.cancel_at_period_end = stripe_sub.cancel_at_period_end
            if stripe_sub.current_period_start:
                new_period_start = datetime.fromtimestamp(
                    stripe_sub.current_period_start,
                    tz=UTC,
                )
                if sub.current_period_end and new_period_start > sub.current_period_end:
                    sub.minutes_carried_over = 0
                    sub.minutes_included = (
                        get_billing_config()
                        .get_plan(
                            sub.plan,
                        )
                        .included_minutes
                    )
                sub.current_period_start = new_period_start
            if stripe_sub.current_period_end:
                sub.current_period_end = datetime.fromtimestamp(
                    stripe_sub.current_period_end,
                    tz=UTC,
                )
            handled = True

            if old_status != "active" and sub.status == "active":
                await telephony_service.reactivate_number(
                    db,
                    sub.owner_user_id,
                )

    elif event_type == "customer.subscription.deleted":
        stripe_sub = event.data.object
        stmt = select(BillingSubscription).where(
            BillingSubscription.stripe_subscription_id == stripe_sub.id,
        )
        result = await db.execute(stmt)
        sub = result.scalar_one_or_none()
        if sub:
            sub.status = "canceled"
            sub.canceled_at = utcnow()
            handled = True

            await telephony_service.suspend_number(
                db,
                sub.owner_user_id,
                reason="subscription_deleted",
            )

    elif event_type == "invoice.payment_failed":
        invoice = event.data.object
        if invoice.subscription:
            stmt = select(BillingSubscription).where(
                BillingSubscription.stripe_subscription_id == invoice.subscription,
            )
            result = await db.execute(stmt)
            sub = result.scalar_one_or_none()
            if sub:
                sub.status = "past_due"
                handled = True

                await telephony_service.suspend_number(
                    db,
                    sub.owner_user_id,
                    reason="payment_failed",
                )

    be.processed_at = utcnow() if handled else None
    await db.flush()

    if handled:
        return {"status": "processed", "type": event_type}
    return {"status": "unhandled", "type": event_type}

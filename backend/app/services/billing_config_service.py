"""Dynamic billing plan configuration.

Resolution order:
1. DB: billing_plan_configs with is_active=True (for future admin portal)
2. Env: BILLING_PLANS_JSON, BILLING_UPGRADE_RULES_JSON, STRIPE_PRICE_IDS_JSON
3. Built-in defaults (hardcoded fallback of last resort)
"""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field

from sqlalchemy import select

from app.config import settings as app_settings

logger = logging.getLogger(__name__)

_cached_config: BillingConfig | None = None
_cached_at: float = 0.0

_DEFAULT_PLANS_JSON = json.dumps(
    [
        {
            "code": "free",
            "name": "Free",
            "price_usd": "0.00",
            "included_minutes": 10,
            "requires_credit_card": True,
            "limited": True,
            "sort_order": 0,
            "description": "Try MattBot with basic call handling",
            "icon": "gift-outline",
        },
        {
            "code": "standard",
            "name": "Standard",
            "price_usd": "20.00",
            "included_minutes": 100,
            "requires_credit_card": True,
            "limited": False,
            "sort_order": 1,
            "description": "For everyday personal use with generous minutes",
            "icon": "star-outline",
        },
        {
            "code": "pro",
            "name": "Pro",
            "price_usd": "50.00",
            "included_minutes": 400,
            "requires_credit_card": True,
            "limited": False,
            "sort_order": 2,
            "description": "High-volume coverage for busy professionals",
            "icon": "rocket-launch-outline",
        },
    ]
)

_DEFAULT_RULES_JSON = json.dumps(
    [
        {"from_plan": "free", "to_plan": "standard", "trigger": "minutes_exceeded"},
    ]
)


@dataclass(frozen=True)
class PlanConfig:
    code: str
    name: str
    price_usd: str
    included_minutes: int
    stripe_price_id: str = ""
    requires_credit_card: bool = True
    limited: bool = False
    sort_order: int = 0
    description: str = ""
    icon: str = ""


@dataclass(frozen=True)
class UpgradeRule:
    from_plan: str
    to_plan: str
    trigger: str = "minutes_exceeded"


@dataclass
class BillingConfig:
    plans: list[PlanConfig] = field(default_factory=list)
    upgrade_rules: list[UpgradeRule] = field(default_factory=list)
    source: str = "env"

    def get_plan(self, code: str) -> PlanConfig:
        for p in self.plans:
            if p.code == code:
                return p
        raise KeyError(f"Unknown plan code: {code}")

    def get_stripe_price_map(self) -> dict[str, str]:
        return {p.code: p.stripe_price_id for p in self.plans if p.stripe_price_id}

    def valid_plan_codes(self) -> list[str]:
        return [p.code for p in self.plans]

    def get_overage_upgrade(self, from_plan: str) -> UpgradeRule | None:
        for r in self.upgrade_rules:
            if r.from_plan == from_plan and r.trigger == "minutes_exceeded":
                return r
        return None


def _parse_stripe_price_ids() -> dict[str, str]:
    """Parse STRIPE_PRICE_IDS_JSON or fall back to individual env vars."""
    raw = app_settings.STRIPE_PRICE_IDS_JSON
    if raw:
        try:
            parsed = json.loads(raw)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            logger.warning("Invalid STRIPE_PRICE_IDS_JSON, falling back to individual vars")
    result = {}
    if app_settings.STRIPE_PRICE_FREE:
        result["free"] = app_settings.STRIPE_PRICE_FREE
    if app_settings.STRIPE_PRICE_STANDARD:
        result["standard"] = app_settings.STRIPE_PRICE_STANDARD
    if app_settings.STRIPE_PRICE_PRO:
        result["pro"] = app_settings.STRIPE_PRICE_PRO
    return result


def _load_from_env() -> BillingConfig:
    plans_raw = app_settings.BILLING_PLANS_JSON or _DEFAULT_PLANS_JSON
    rules_raw = app_settings.BILLING_UPGRADE_RULES_JSON or _DEFAULT_RULES_JSON

    try:
        plans_data = json.loads(plans_raw)
    except json.JSONDecodeError:
        logger.error("Invalid BILLING_PLANS_JSON, using defaults")
        plans_data = json.loads(_DEFAULT_PLANS_JSON)

    try:
        rules_data = json.loads(rules_raw)
    except json.JSONDecodeError:
        logger.error("Invalid BILLING_UPGRADE_RULES_JSON, using defaults")
        rules_data = json.loads(_DEFAULT_RULES_JSON)

    stripe_ids = _parse_stripe_price_ids()

    plans = [
        PlanConfig(
            code=p["code"],
            name=p["name"],
            price_usd=p.get("price_usd", "0.00"),
            included_minutes=p.get("included_minutes", 0),
            stripe_price_id=stripe_ids.get(p["code"], ""),
            requires_credit_card=p.get("requires_credit_card", True),
            limited=p.get("limited", False),
            sort_order=p.get("sort_order", 0),
            description=p.get("description", ""),
            icon=p.get("icon", ""),
        )
        for p in plans_data
    ]

    upgrade_rules = [
        UpgradeRule(
            from_plan=r["from_plan"],
            to_plan=r["to_plan"],
            trigger=r.get("trigger", "minutes_exceeded"),
        )
        for r in rules_data
    ]

    return BillingConfig(plans=plans, upgrade_rules=upgrade_rules, source="env")


async def _load_from_db() -> BillingConfig | None:
    """Try to load active config from DB. Returns None if no active config."""
    try:
        from app.database import async_session_factory
        from app.models.billing_plan_config import (
            BillingPlanConfigPlan,
            BillingPlanConfigRow,
            BillingPlanConfigRule,
        )

        async with async_session_factory() as db:
            stmt = select(BillingPlanConfigRow).where(BillingPlanConfigRow.is_active.is_(True))
            result = await db.execute(stmt)
            config_row = result.scalar_one_or_none()
            if config_row is None:
                return None

            plan_stmt = (
                select(BillingPlanConfigPlan)
                .where(BillingPlanConfigPlan.config_id == config_row.id)
                .order_by(BillingPlanConfigPlan.sort_order)
            )
            plan_result = await db.execute(plan_stmt)
            db_plans = plan_result.scalars().all()

            rule_stmt = select(BillingPlanConfigRule).where(
                BillingPlanConfigRule.config_id == config_row.id
            )
            rule_result = await db.execute(rule_stmt)
            db_rules = rule_result.scalars().all()

        plans = [
            PlanConfig(
                code=p.code,
                name=p.name,
                price_usd=p.price_usd,
                included_minutes=p.included_minutes,
                stripe_price_id=p.stripe_price_id or "",
                requires_credit_card=p.requires_credit_card,
                limited=p.limited,
                sort_order=p.sort_order,
                description=p.description,
                icon=p.icon,
            )
            for p in db_plans
        ]

        upgrade_rules = [
            UpgradeRule(
                from_plan=r.from_plan,
                to_plan=r.to_plan,
                trigger=r.trigger,
            )
            for r in db_rules
        ]

        return BillingConfig(plans=plans, upgrade_rules=upgrade_rules, source="db")
    except Exception:
        logger.debug("DB billing config not available, using env", exc_info=True)
        return None


def get_billing_config() -> BillingConfig:
    """Synchronous config accessor. Uses cached value or loads from env.

    DB loading is async and handled by get_billing_config_async().
    For sync contexts (validators, startup), always returns env config.
    """
    global _cached_config, _cached_at
    now = time.monotonic()
    if _cached_config is not None and (now - _cached_at) < app_settings.BILLING_CONFIG_CACHE_TTL:
        return _cached_config
    config = _load_from_env()
    _cached_config = config
    _cached_at = now
    return config


async def get_billing_config_async() -> BillingConfig:
    """Async config accessor. Tries DB first, falls back to env."""
    global _cached_config, _cached_at
    now = time.monotonic()
    if _cached_config is not None and (now - _cached_at) < app_settings.BILLING_CONFIG_CACHE_TTL:
        return _cached_config
    db_config = await _load_from_db()
    if db_config is not None:
        _cached_config = db_config
        _cached_at = now
        return db_config
    config = _load_from_env()
    _cached_config = config
    _cached_at = now
    return config


def invalidate_cache() -> None:
    """Clear cached config (call after admin portal writes)."""
    global _cached_config, _cached_at
    _cached_config = None
    _cached_at = 0.0

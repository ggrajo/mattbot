"""Billing plan configuration with caching and optional env-based overrides."""

from __future__ import annotations

import json
import logging
import time
from dataclasses import dataclass, field

from app.config import settings as app_settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data classes
# ---------------------------------------------------------------------------

_DEFAULT_PLANS_JSON = json.dumps([
    {
        "code": "free",
        "name": "Free",
        "price_usd": "0.00",
        "included_minutes": 10,
        "limited": True,
        "sort_order": 0,
        "recommended": False,
    },
    {
        "code": "standard",
        "name": "Standard",
        "price_usd": "20.00",
        "included_minutes": 100,
        "limited": False,
        "sort_order": 1,
        "recommended": True,
    },
    {
        "code": "pro",
        "name": "Pro",
        "price_usd": "50.00",
        "included_minutes": 400,
        "limited": False,
        "sort_order": 2,
        "recommended": False,
    },
])

_DEFAULT_UPGRADE_RULES_JSON = json.dumps([
    {"from_plan": "free", "to_plan": "standard", "trigger": "minutes_exceeded"},
])


@dataclass(frozen=True)
class PlanConfig:
    code: str
    name: str
    price_usd: str
    included_minutes: int
    limited: bool = False
    sort_order: int = 0
    recommended: bool = False
    description: str = ""
    icon: str = ""
    features: list[str] = field(default_factory=list)
    requires_credit_card: bool = False


@dataclass(frozen=True)
class OverageUpgradeRule:
    from_plan: str
    to_plan: str
    trigger: str


@dataclass
class BillingConfig:
    plans: list[PlanConfig]
    upgrade_rules: list[OverageUpgradeRule] = field(default_factory=list)

    def valid_plan_codes(self) -> list[str]:
        return [p.code for p in self.plans]

    def get_plan(self, code: str) -> PlanConfig:
        for plan in self.plans:
            if plan.code == code:
                return plan
        raise KeyError(f"Unknown plan code: {code}")

    def get_overage_upgrade(self, from_plan: str) -> OverageUpgradeRule | None:
        for rule in self.upgrade_rules:
            if rule.from_plan == from_plan:
                return rule
        return None

    def get_stripe_price_map(self) -> dict[str, str]:
        raw = app_settings.STRIPE_PRICE_IDS_JSON
        if raw:
            return json.loads(raw)
        return {}


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

_cached_config: BillingConfig | None = None
_cached_at: float = 0.0


def invalidate_cache() -> None:
    global _cached_config, _cached_at
    _cached_config = None
    _cached_at = 0.0


def _build_config() -> BillingConfig:
    plans_raw = app_settings.BILLING_PLANS_JSON or _DEFAULT_PLANS_JSON
    plans_data = json.loads(plans_raw) if isinstance(plans_raw, str) else plans_raw

    plans = []
    for p in plans_data:
        plans.append(PlanConfig(
            code=p["code"],
            name=p["name"],
            price_usd=p.get("price_usd", "0.00"),
            included_minutes=p.get("included_minutes", 0),
            limited=p.get("limited", False),
            sort_order=p.get("sort_order", 0),
            recommended=p.get("recommended", False),
            description=p.get("description", ""),
            icon=p.get("icon", ""),
            features=p.get("features", []),
            requires_credit_card=p.get("requires_credit_card", False),
        ))

    rules_raw = app_settings.BILLING_UPGRADE_RULES_JSON or json.dumps([
        {"from_plan": "free", "to_plan": "standard", "trigger": "minutes_exceeded"},
    ])
    rules_data = json.loads(rules_raw) if isinstance(rules_raw, str) else rules_raw
    upgrade_rules = [
        OverageUpgradeRule(
            from_plan=r["from_plan"],
            to_plan=r["to_plan"],
            trigger=r["trigger"],
        )
        for r in rules_data
    ]

    return BillingConfig(plans=plans, upgrade_rules=upgrade_rules)


def get_billing_config() -> BillingConfig:
    global _cached_config, _cached_at
    ttl = app_settings.BILLING_CONFIG_CACHE_TTL
    now = time.monotonic()
    if _cached_config is not None and (now - _cached_at) < ttl:
        return _cached_config
    _cached_config = _build_config()
    _cached_at = now
    return _cached_config


async def get_billing_config_async() -> BillingConfig:
    return get_billing_config()


# ---------------------------------------------------------------------------
# Convenience helpers
# ---------------------------------------------------------------------------


def get_plan_config(plan: str) -> dict:
    pc = get_billing_config().get_plan(plan)
    return {
        "code": pc.code,
        "name": pc.name,
        "price_usd": pc.price_usd,
        "included_minutes": pc.included_minutes,
    }


def get_minutes_for_plan(plan: str) -> int:
    return get_billing_config().get_plan(plan).included_minutes

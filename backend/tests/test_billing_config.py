"""Tests for the billing configuration service and plans endpoint."""

import json
import os

import pytest
from httpx import AsyncClient

from app.services.billing_config_service import (
    BillingConfig,
    get_billing_config,
    get_billing_config_async,
    invalidate_cache,
)
from tests.conftest import create_test_user


# ---------------------------------------------------------------------------
# Unit tests – BillingConfig object from defaults
# ---------------------------------------------------------------------------


class TestDefaultConfig:
    def setup_method(self):
        invalidate_cache()

    def test_default_config_has_three_plans(self):
        config = get_billing_config()
        assert len(config.plans) == 3

    def test_default_plan_codes(self):
        config = get_billing_config()
        assert set(config.valid_plan_codes()) == {"free", "standard", "pro"}

    def test_get_plan_free(self):
        plan = get_billing_config().get_plan("free")
        assert plan.code == "free"
        assert plan.name == "Free"
        assert plan.price_usd == "0.00"
        assert plan.included_minutes == 10
        assert plan.limited is True

    def test_get_plan_standard(self):
        plan = get_billing_config().get_plan("standard")
        assert plan.code == "standard"
        assert plan.name == "Standard"
        assert plan.price_usd == "20.00"
        assert plan.included_minutes == 100
        assert plan.limited is False
        assert plan.recommended is True

    def test_get_plan_pro(self):
        plan = get_billing_config().get_plan("pro")
        assert plan.code == "pro"
        assert plan.name == "Pro"
        assert plan.price_usd == "50.00"
        assert plan.included_minutes == 400
        assert plan.limited is False

    def test_get_plan_unknown_raises(self):
        with pytest.raises(KeyError, match="Unknown plan code"):
            get_billing_config().get_plan("unknown")

    def test_overage_upgrade_from_free(self):
        rule = get_billing_config().get_overage_upgrade("free")
        assert rule is not None
        assert rule.from_plan == "free"
        assert rule.to_plan == "standard"
        assert rule.trigger == "minutes_exceeded"

    def test_overage_upgrade_from_standard(self):
        rule = get_billing_config().get_overage_upgrade("standard")
        assert rule is None

    def test_valid_plan_codes_list(self):
        codes = get_billing_config().valid_plan_codes()
        assert isinstance(codes, list)
        assert codes == ["free", "standard", "pro"]


# ---------------------------------------------------------------------------
# Cache invalidation
# ---------------------------------------------------------------------------


class TestCacheInvalidation:
    def test_cache_invalidation(self):
        cfg1 = get_billing_config()
        invalidate_cache()
        cfg2 = get_billing_config()
        assert cfg1.valid_plan_codes() == cfg2.valid_plan_codes()
        assert cfg2 is not cfg1


# ---------------------------------------------------------------------------
# Async accessor
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_async_config_returns_billing_config():
    invalidate_cache()
    config = await get_billing_config_async()
    assert isinstance(config, BillingConfig)
    assert len(config.plans) == 3


# ---------------------------------------------------------------------------
# Custom BILLING_PLANS_JSON env override
# ---------------------------------------------------------------------------


class TestCustomPlansEnv:
    def setup_method(self):
        invalidate_cache()

    def teardown_method(self):
        os.environ.pop("BILLING_PLANS_JSON", None)
        invalidate_cache()

    def test_custom_plans_json_env(self, monkeypatch):
        custom_plans = [
            {
                "code": "starter",
                "name": "Starter",
                "price_usd": "5.00",
                "included_minutes": 30,
            },
            {
                "code": "enterprise",
                "name": "Enterprise",
                "price_usd": "200.00",
                "included_minutes": 5000,
            },
        ]
        monkeypatch.setattr(
            "app.services.billing_config_service.app_settings.BILLING_PLANS_JSON",
            json.dumps(custom_plans),
        )
        invalidate_cache()
        config = get_billing_config()
        codes = config.valid_plan_codes()
        assert codes == ["starter", "enterprise"]
        assert config.get_plan("starter").price_usd == "5.00"
        assert config.get_plan("enterprise").included_minutes == 5000


# ---------------------------------------------------------------------------
# Stripe price map
# ---------------------------------------------------------------------------


class TestStripePriceMap:
    def setup_method(self):
        invalidate_cache()

    def teardown_method(self):
        invalidate_cache()

    def test_stripe_price_map(self, monkeypatch):
        monkeypatch.setattr(
            "app.services.billing_config_service.app_settings.STRIPE_PRICE_IDS_JSON",
            json.dumps(
                {
                    "free": "price_free_123",
                    "standard": "price_std_456",
                    "pro": "price_pro_789",
                }
            ),
        )
        invalidate_cache()
        config = get_billing_config()
        price_map = config.get_stripe_price_map()
        assert price_map == {
            "free": "price_free_123",
            "standard": "price_std_456",
            "pro": "price_pro_789",
        }


# ---------------------------------------------------------------------------
# Integration tests – /api/v1/billing/plans endpoint
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_plans_endpoint_returns_three(client: AsyncClient):
    user = await create_test_user(client, "plans1@test.com")
    headers = {"Authorization": f"Bearer {user['access_token']}"}

    resp = await client.get("/api/v1/billing/plans", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["plans"]) == 3

    codes = [p["code"] for p in data["plans"]]
    assert "free" in codes
    assert "standard" in codes
    assert "pro" in codes

    for plan in data["plans"]:
        assert "code" in plan
        assert "name" in plan
        assert "price_usd" in plan
        assert "included_minutes" in plan


@pytest.mark.asyncio
async def test_plans_endpoint_requires_auth(client: AsyncClient):
    resp = await client.get("/api/v1/billing/plans")
    assert resp.status_code == 401

# Source Generated with Decompyle++
# File: billing_config_service.pyc (Python 3.13)

__doc__ = 'Dynamic billing plan configuration.\n\nResolution order:\n1. DB: billing_plan_configs with is_active=True (for future admin portal)\n2. Env: BILLING_PLANS_JSON, BILLING_UPGRADE_RULES_JSON, STRIPE_PRICE_IDS_JSON\n3. Built-in defaults (hardcoded fallback of last resort)\n'
from __future__ import annotations
import json
import logging
import time
from dataclasses import dataclass, field
from sqlalchemy import select
from app.config import settings as app_settings
logger = None(__name__)
_cached_config: 'BillingConfig | None' = None
_cached_at: 'float' = 0
_DEFAULT_PLANS_JSON = None([
    {
        'code': 'free',
        'name': 'Free',
        'price_usd': '0.00',
        'included_minutes': 10,
        'requires_credit_card': True,
        'limited': True,
        'sort_order': 0,
        'description': 'Try MattBot with basic call handling',
        'icon': 'gift-outline' },
    {
        'code': 'standard',
        'name': 'Standard',
        'price_usd': '20.00',
        'included_minutes': 100,
        'requires_credit_card': True,
        'limited': False,
        'sort_order': 1,
        'description': 'For everyday personal use with generous minutes',
        'icon': 'star-outline' },
    {
        'code': 'pro',
        'name': 'Pro',
        'price_usd': '50.00',
        'included_minutes': 400,
        'requires_credit_card': True,
        'limited': False,
        'sort_order': 2,
        'description': 'High-volume coverage for busy professionals',
        'icon': 'rocket-launch-outline' }])
_DEFAULT_RULES_JSON = None([
    {
        'from_plan': 'free',
        'to_plan': 'standard',
        'trigger': 'minutes_exceeded' }])
# WARNING: Decompyle incomplete

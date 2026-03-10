# Source Generated with Decompyle++
# File: onboarding.pyc (Python 3.13)

from __future__ import annotations
from pydantic import BaseModel, field_validator
ONBOARDING_STEPS = [
    'account_created',
    'email_verified',
    'mfa_enrolled',
    'privacy_review',
    'settings_configured',
    'assistant_setup',
    'calendar_setup',
    'plan_selected',
    'payment_method_added',
    'number_provisioned',
    'call_modes_configured',
    'onboarding_complete']
COMPLETABLE_STEPS = {
    'plan_selected',
    'calendar_setup',
    'privacy_review',
    'assistant_setup',
    'number_provisioned',
    'onboarding_complete',
    'settings_configured',
    'payment_method_added',
    'call_modes_configured'}
# WARNING: Decompyle incomplete

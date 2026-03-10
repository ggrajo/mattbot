# Source Generated with Decompyle++
# File: settings.pyc (Python 3.13)

from __future__ import annotations
from pydantic import BaseModel, Field, field_validator
VALID_PRIVACY_MODES = ('private', 'preview')
VALID_RETENTION_DAYS = (7, 30, 90)
VALID_OBJECTIVE_MODES = ('screen_and_summarize', 'take_message', 'custom')
VALID_THEME_PREFERENCES = ('system', 'light', 'dark')
MAX_QUIET_INTERVALS = 5
VALID_HANDOFF_TRIGGERS = ('vip_only', 'urgent_only', 'vip_and_urgent', 'always', 'never')
VALID_AFTER_HOURS_BEHAVIORS = ('screen_normally', 'voicemail_only', 'reject')
VALID_TEMPERAMENT_PRESETS = ('professional_polite', 'casual_friendly', 'short_and_direct', 'warm_and_supportive', 'formal', 'custom')
VALID_SWEARING_RULES = ('no_swearing', 'mirror_caller', 'allow')
VALID_VIP_NOTIFICATION_INTENSITIES = ('normal', 'high', 'urgent')
VALID_BLOCKED_CALLER_BEHAVIORS = ('end_immediately', 'play_message', 'silent_drop')
VALID_TEXT_APPROVAL_MODES = ('always_approve', 'auto_send', 'never')
VALID_GREETING_TEMPLATES = ('standard', 'brief', 'formal', 'custom')
VALID_TRANSCRIPT_DISCLOSURE_MODES = ('ai_says_it', 'silent', 'beep')
VALID_IMPORTANT_RULES = ('vip_and_urgent', 'vip_only', 'urgent_only', 'all')
VALID_BIOMETRIC_POLICIES = ('gate_call_details', 'gate_all', 'off')
# WARNING: Decompyle incomplete

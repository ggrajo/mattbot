from __future__ import annotations

from pydantic import BaseModel, Field, field_validator

VALID_PRIVACY_MODES = ("private", "preview")
VALID_RETENTION_DAYS = (7, 30, 90)
VALID_OBJECTIVE_MODES = ("screen_and_summarize", "take_message", "custom")
VALID_THEME_PREFERENCES = ("system", "light", "dark")
MAX_QUIET_INTERVALS = 5

VALID_HANDOFF_TRIGGERS = ("vip_only", "urgent_only", "vip_and_urgent", "always", "never")
VALID_AFTER_HOURS_BEHAVIORS = ("screen_normally", "voicemail_only", "reject")
VALID_TEMPERAMENT_PRESETS = (
    "professional_polite",
    "casual_friendly",
    "short_and_direct",
    "warm_and_supportive",
    "formal",
    "custom",
)
VALID_SWEARING_RULES = ("no_swearing", "mirror_caller", "allow")
VALID_VIP_NOTIFICATION_INTENSITIES = ("normal", "high", "urgent")
VALID_BLOCKED_CALLER_BEHAVIORS = ("end_immediately", "play_message", "silent_drop")
VALID_TEXT_APPROVAL_MODES = ("always_approve", "auto_send", "never")
VALID_GREETING_TEMPLATES = ("standard", "brief", "formal", "custom")
VALID_TRANSCRIPT_DISCLOSURE_MODES = ("ai_says_it", "silent", "beep")
VALID_IMPORTANT_RULES = ("vip_and_urgent", "vip_only", "urgent_only", "all")
VALID_BIOMETRIC_POLICIES = ("gate_call_details", "gate_all", "off")


class QuietHoursInterval(BaseModel):
    label: str = ""
    start: str
    end: str
    days: list[int] = [0, 1, 2, 3, 4, 5, 6]

    @field_validator("start", "end")
    @classmethod
    def validate_time_format(cls, v: str) -> str:
        parts = v.split(":")
        if len(parts) != 2:
            raise ValueError("Time must be in HH:MM format")
        try:
            h, m = int(parts[0]), int(parts[1])
            if not (0 <= h <= 23):
                raise ValueError
            if not (0 <= m <= 59):
                raise ValueError
        except ValueError:
            raise ValueError("Time must be in HH:MM format with valid hours/minutes") from None
        return v

    @field_validator("days")
    @classmethod
    def validate_interval_days(cls, v: list[int]) -> list[int]:
        for d in v:
            if d < 0 or d > 6:
                raise ValueError("Day values must be 0-6 (Sun-Sat)")
        return v


class SettingsResponse(BaseModel):
    theme_preference: str = "system"
    notification_privacy_mode: str
    quiet_hours_enabled: bool
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
    quiet_hours_days: list[int] = []
    quiet_hours_intervals: list[QuietHoursInterval] = []
    quiet_hours_allow_vip: bool = False
    timezone: str
    personal_phone_last4: str | None = None
    memory_enabled: bool
    data_retention_days: int
    biometric_unlock_enabled: bool
    recording_enabled: bool
    call_objective_mode: str
    max_call_length_seconds: int
    vip_max_call_length_seconds: int

    handoff_enabled: bool = False
    handoff_trigger: str = "vip_only"
    handoff_offer_timeout_seconds: int = 20
    handoff_target_phone_last4: str | None = None

    business_hours_enabled: bool = False
    business_hours_start: str | None = None
    business_hours_end: str | None = None
    business_hours_days: list[int] = []
    after_hours_behavior: str = "screen_normally"

    temperament_preset: str = "professional_polite"
    swearing_rule: str = "no_swearing"
    language_primary: str = "en"
    language_secondary: str | None = None

    vip_calls_mark_important: bool = True
    vip_notification_intensity: str = "normal"
    blocked_caller_behavior: str = "end_immediately"
    log_blocked_attempts: bool = False
    notify_on_blocked: bool = False

    spam_labeling_enabled: bool = True
    block_suggestions_enabled: bool = True
    repeat_caller_threshold: int = 3

    text_approval_mode: str = "always_approve"

    assistant_name: str = "Alex"

    greeting_template: str = "standard"

    transcript_disclosure_mode: str = "ai_says_it"
    recording_announcement_required: bool = True

    important_rule: str = "vip_and_urgent"

    biometric_policy: str = "gate_call_details"

    calendar_booking_enabled: bool = False
    calendar_default_duration_minutes: int = 30
    calendar_booking_window_days: int = 14

    urgent_notify_sms: bool = False
    urgent_notify_email: bool = False
    urgent_notify_call: bool = False
    urgent_notify_phone_last4: str | None = None
    urgent_notify_email_address: str | None = None

    revision: int

    model_config = {"from_attributes": True}


class SettingsChanges(BaseModel):
    theme_preference: str | None = None
    notification_privacy_mode: str | None = None
    quiet_hours_enabled: bool | None = None
    quiet_hours_start: str | None = None
    quiet_hours_end: str | None = None
    quiet_hours_days: list[int] | None = None
    quiet_hours_intervals: list[QuietHoursInterval] | None = None
    quiet_hours_allow_vip: bool | None = None
    timezone: str | None = None
    personal_phone: str | None = Field(None, max_length=20)
    memory_enabled: bool | None = None
    data_retention_days: int | None = None
    biometric_unlock_enabled: bool | None = None
    recording_enabled: bool | None = None
    call_objective_mode: str | None = None
    max_call_length_seconds: int | None = None
    vip_max_call_length_seconds: int | None = None

    handoff_enabled: bool | None = None
    handoff_trigger: str | None = None
    handoff_offer_timeout_seconds: int | None = None
    handoff_target_phone: str | None = Field(None, max_length=20)

    business_hours_enabled: bool | None = None
    business_hours_start: str | None = None
    business_hours_end: str | None = None
    business_hours_days: list[int] | None = None
    after_hours_behavior: str | None = None

    temperament_preset: str | None = None
    swearing_rule: str | None = None
    language_primary: str | None = None
    language_secondary: str | None = None

    vip_calls_mark_important: bool | None = None
    vip_notification_intensity: str | None = None
    blocked_caller_behavior: str | None = None
    log_blocked_attempts: bool | None = None
    notify_on_blocked: bool | None = None

    spam_labeling_enabled: bool | None = None
    block_suggestions_enabled: bool | None = None
    repeat_caller_threshold: int | None = None

    text_approval_mode: str | None = None

    assistant_name: str | None = None

    greeting_template: str | None = None

    transcript_disclosure_mode: str | None = None
    recording_announcement_required: bool | None = None

    important_rule: str | None = None

    biometric_policy: str | None = None

    calendar_booking_enabled: bool | None = None
    calendar_default_duration_minutes: int | None = None
    calendar_booking_window_days: int | None = None

    urgent_notify_sms: bool | None = None
    urgent_notify_email: bool | None = None
    urgent_notify_call: bool | None = None
    urgent_notify_phone: str | None = Field(None, max_length=20)
    urgent_notify_email_address: str | None = None

    @field_validator("urgent_notify_email_address")
    @classmethod
    def validate_urgent_email(cls, v: str | None) -> str | None:
        if v is not None:
            v = v.strip()
            if len(v) > 254:
                raise ValueError("Email too long (max 254 characters)")
            if "@" not in v:
                raise ValueError("Invalid email address")
        return v

    @field_validator("theme_preference")
    @classmethod
    def validate_theme(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_THEME_PREFERENCES:
            raise ValueError(f"Must be one of: {', '.join(VALID_THEME_PREFERENCES)}")
        return v

    @field_validator("notification_privacy_mode")
    @classmethod
    def validate_privacy_mode(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_PRIVACY_MODES:
            raise ValueError(f"Must be one of: {', '.join(VALID_PRIVACY_MODES)}")
        return v

    @field_validator("data_retention_days")
    @classmethod
    def validate_retention(cls, v: int | None) -> int | None:
        if v is not None and v not in VALID_RETENTION_DAYS:
            raise ValueError(f"Must be one of: {', '.join(str(d) for d in VALID_RETENTION_DAYS)}")
        return v

    @field_validator("quiet_hours_days")
    @classmethod
    def validate_days(cls, v: list[int] | None) -> list[int] | None:
        if v is not None:
            for d in v:
                if d < 0 or d > 6:
                    raise ValueError("Day values must be 0-6 (Sun-Sat)")
        return v

    @field_validator("quiet_hours_intervals")
    @classmethod
    def validate_intervals(
        cls, v: list[QuietHoursInterval] | None
    ) -> list[QuietHoursInterval] | None:
        if v is not None and len(v) > MAX_QUIET_INTERVALS:
            raise ValueError(f"Maximum {MAX_QUIET_INTERVALS} quiet hour intervals allowed")
        return v

    @field_validator(
        "quiet_hours_start",
        "quiet_hours_end",
        "business_hours_start",
        "business_hours_end",
    )
    @classmethod
    def validate_time(cls, v: str | None) -> str | None:
        if v is not None:
            parts = v.split(":")
            if len(parts) != 2:
                raise ValueError("Time must be in HH:MM format")
            try:
                h, m = int(parts[0]), int(parts[1])
                if not (0 <= h <= 23):
                    raise ValueError
                if not (0 <= m <= 59):
                    raise ValueError
            except ValueError:
                raise ValueError("Time must be in HH:MM format with valid hours/minutes") from None
        return v

    @field_validator("max_call_length_seconds")
    @classmethod
    def validate_max_call(cls, v: int | None) -> int | None:
        if v is not None and not (120 <= v <= 300):
            raise ValueError("Must be between 120 and 300")
        return v

    @field_validator("vip_max_call_length_seconds")
    @classmethod
    def validate_vip_call(cls, v: int | None) -> int | None:
        if v is not None and not (180 <= v <= 600):
            raise ValueError("Must be between 180 and 600")
        return v

    @field_validator("call_objective_mode")
    @classmethod
    def validate_objective(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_OBJECTIVE_MODES:
            raise ValueError(f"Must be one of: {', '.join(VALID_OBJECTIVE_MODES)}")
        return v

    @field_validator("timezone")
    @classmethod
    def validate_timezone(cls, v: str | None) -> str | None:
        if v is not None:
            if len(v) > 60:
                raise ValueError("Timezone string too long")
            if "/" not in v and v != "UTC":
                raise ValueError("Invalid timezone format")
        return v

    @field_validator("handoff_trigger")
    @classmethod
    def validate_handoff_trigger(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_HANDOFF_TRIGGERS:
            raise ValueError(f"Must be one of: {', '.join(VALID_HANDOFF_TRIGGERS)}")
        return v

    @field_validator("handoff_offer_timeout_seconds")
    @classmethod
    def validate_handoff_timeout(cls, v: int | None) -> int | None:
        if v is not None and not (10 <= v <= 60):
            raise ValueError("Must be between 10 and 60")
        return v

    @field_validator("business_hours_days")
    @classmethod
    def validate_business_days(cls, v: list[int] | None) -> list[int] | None:
        if v is not None:
            for d in v:
                if d < 0 or d > 6:
                    raise ValueError("Day values must be 0-6 (Sun-Sat)")
        return v

    @field_validator("after_hours_behavior")
    @classmethod
    def validate_after_hours(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_AFTER_HOURS_BEHAVIORS:
            raise ValueError(f"Must be one of: {', '.join(VALID_AFTER_HOURS_BEHAVIORS)}")
        return v

    @field_validator("temperament_preset")
    @classmethod
    def validate_temperament(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_TEMPERAMENT_PRESETS:
            raise ValueError(f"Must be one of: {', '.join(VALID_TEMPERAMENT_PRESETS)}")
        return v

    @field_validator("swearing_rule")
    @classmethod
    def validate_swearing(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_SWEARING_RULES:
            raise ValueError(f"Must be one of: {', '.join(VALID_SWEARING_RULES)}")
        return v

    @field_validator("language_primary", "language_secondary")
    @classmethod
    def validate_language(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 10:
            raise ValueError("Language code too long")
        return v

    @field_validator("vip_notification_intensity")
    @classmethod
    def validate_vip_notif(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_VIP_NOTIFICATION_INTENSITIES:
            raise ValueError(f"Must be one of: {', '.join(VALID_VIP_NOTIFICATION_INTENSITIES)}")
        return v

    @field_validator("blocked_caller_behavior")
    @classmethod
    def validate_blocked_behavior(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_BLOCKED_CALLER_BEHAVIORS:
            raise ValueError(f"Must be one of: {', '.join(VALID_BLOCKED_CALLER_BEHAVIORS)}")
        return v

    @field_validator("repeat_caller_threshold")
    @classmethod
    def validate_repeat_threshold(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 10):
            raise ValueError("Must be between 1 and 10")
        return v

    @field_validator("text_approval_mode")
    @classmethod
    def validate_text_approval(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_TEXT_APPROVAL_MODES:
            raise ValueError(f"Must be one of: {', '.join(VALID_TEXT_APPROVAL_MODES)}")
        return v

    @field_validator("assistant_name")
    @classmethod
    def validate_assistant_name(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 60:
            raise ValueError("Assistant name too long (max 60 characters)")
        return v

    @field_validator("greeting_template")
    @classmethod
    def validate_greeting(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_GREETING_TEMPLATES:
            raise ValueError(f"Must be one of: {', '.join(VALID_GREETING_TEMPLATES)}")
        return v

    @field_validator("transcript_disclosure_mode")
    @classmethod
    def validate_disclosure(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_TRANSCRIPT_DISCLOSURE_MODES:
            raise ValueError(f"Must be one of: {', '.join(VALID_TRANSCRIPT_DISCLOSURE_MODES)}")
        return v

    @field_validator("important_rule")
    @classmethod
    def validate_important_rule(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_IMPORTANT_RULES:
            raise ValueError(f"Must be one of: {', '.join(VALID_IMPORTANT_RULES)}")
        return v

    @field_validator("biometric_policy")
    @classmethod
    def validate_biometric_policy(cls, v: str | None) -> str | None:
        if v is not None and v not in VALID_BIOMETRIC_POLICIES:
            raise ValueError(f"Must be one of: {', '.join(VALID_BIOMETRIC_POLICIES)}")
        return v

    @field_validator("calendar_default_duration_minutes")
    @classmethod
    def validate_calendar_duration(cls, v: int | None) -> int | None:
        if v is not None and not (15 <= v <= 120):
            raise ValueError("Must be between 15 and 120")
        return v

    @field_validator("calendar_booking_window_days")
    @classmethod
    def validate_calendar_window(cls, v: int | None) -> int | None:
        if v is not None and not (1 <= v <= 60):
            raise ValueError("Must be between 1 and 60")
        return v


class SettingsPatchRequest(BaseModel):
    expected_revision: int = Field(..., ge=1)
    changes: SettingsChanges


class SettingsPatchResponse(BaseModel):
    revision: int
    settings: SettingsResponse

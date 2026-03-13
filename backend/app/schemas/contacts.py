"""Pydantic schemas for contact profile endpoints."""

from __future__ import annotations

import re
from datetime import datetime

from pydantic import BaseModel, field_validator

DEFAULT_CATEGORIES: set[str] = {
    "acquaintances",
    "business",
    "clients",
    "colleagues",
    "family",
    "friends",
    "healthcare",
    "other",
    "vendors",
}

_SLUG_RE = re.compile(r"^[a-z][a-z0-9_]{0,49}$")

_TEMPERAMENTS = {
    "casual_friendly",
    "formal",
    "professional_polite",
    "short_and_direct",
    "warm_and_supportive",
}

_SWEARING_RULES = {"allow", "mirror_caller", "no_swearing"}

_GREETING_TEMPLATES = {"brief", "custom", "formal", "standard"}


def _validate_category_slug(v: str) -> str:
    """Validate that a category value looks like a valid slug."""
    if not _SLUG_RE.match(v):
        raise ValueError(
            "Category must be lowercase alphanumeric/underscore, start with a letter, max 50 chars"
        )
    return v


class ContactCreateRequest(BaseModel):
    phone_number: str
    display_name: str | None = None
    company: str | None = None
    relationship: str | None = None
    email: str | None = None
    notes: str | None = None
    category: str = "other"
    is_vip: bool = False
    is_blocked: bool = False
    block_reason: str | None = None
    ai_temperament_preset: str | None = None
    ai_greeting_template: str | None = None
    ai_greeting_instructions: str | None = None
    ai_swearing_rule: str | None = None
    ai_max_call_length_seconds: int | None = None
    ai_custom_instructions: str | None = None

    @field_validator("phone_number")
    @classmethod
    def validate_e164(cls, v: str) -> str:
        v = re.sub(r"[\s\-\(\)\.]+", "", v.strip())
        if not re.match(r"^\+[1-9]\d{1,14}$", v):
            raise ValueError("Phone number must be in E.164 format")
        return v

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        return _validate_category_slug(v)

    @field_validator("ai_temperament_preset")
    @classmethod
    def validate_temperament(cls, v: str | None) -> str | None:
        if v is not None and v not in _TEMPERAMENTS:
            raise ValueError(f"ai_temperament_preset must be one of {_TEMPERAMENTS}")
        return v

    @field_validator("ai_swearing_rule")
    @classmethod
    def validate_swearing(cls, v: str | None) -> str | None:
        if v is not None and v not in _SWEARING_RULES:
            raise ValueError(f"ai_swearing_rule must be one of {_SWEARING_RULES}")
        return v

    @field_validator("ai_greeting_template")
    @classmethod
    def validate_greeting(cls, v: str | None) -> str | None:
        if v is not None and v not in _GREETING_TEMPLATES:
            raise ValueError(f"ai_greeting_template must be one of {_GREETING_TEMPLATES}")
        return v

    @field_validator("ai_max_call_length_seconds")
    @classmethod
    def validate_max_call(cls, v: int | None) -> int | None:
        if v is not None and not (60 <= v <= 900):
            raise ValueError("ai_max_call_length_seconds must be between 60 and 900")
        return v

    @field_validator("display_name")
    @classmethod
    def validate_display_name(cls, v: str | None) -> str | None:
        if v is not None and len(v) > 100:
            raise ValueError("Display name must be 100 characters or fewer")
        return v


class ContactUpdateRequest(BaseModel):
    display_name: str | None = None
    company: str | None = None
    relationship: str | None = None
    email: str | None = None
    notes: str | None = None
    category: str | None = None
    is_vip: bool | None = None
    is_blocked: bool | None = None
    block_reason: str | None = None
    ai_temperament_preset: str | None = None
    ai_greeting_template: str | None = None
    ai_greeting_instructions: str | None = None
    ai_swearing_rule: str | None = None
    ai_max_call_length_seconds: int | None = None
    ai_custom_instructions: str | None = None
    clear_ai_temperament: bool = False
    clear_ai_greeting_template: bool = False
    clear_ai_greeting_instructions: bool = False
    clear_ai_swearing_rule: bool = False
    clear_ai_max_call_length: bool = False
    clear_ai_custom_instructions: bool = False

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str | None) -> str | None:
        if v is not None:
            _validate_category_slug(v)
        return v

    @field_validator("ai_temperament_preset")
    @classmethod
    def validate_temperament(cls, v: str | None) -> str | None:
        if v is not None and v not in _TEMPERAMENTS:
            raise ValueError(f"ai_temperament_preset must be one of {_TEMPERAMENTS}")
        return v

    @field_validator("ai_swearing_rule")
    @classmethod
    def validate_swearing(cls, v: str | None) -> str | None:
        if v is not None and v not in _SWEARING_RULES:
            raise ValueError(f"ai_swearing_rule must be one of {_SWEARING_RULES}")
        return v

    @field_validator("ai_greeting_template")
    @classmethod
    def validate_greeting(cls, v: str | None) -> str | None:
        if v is not None and v not in _GREETING_TEMPLATES:
            raise ValueError(f"ai_greeting_template must be one of {_GREETING_TEMPLATES}")
        return v


class ContactResponse(BaseModel):
    id: str
    phone_last4: str
    display_name: str | None = None
    company: str | None = None
    relationship: str | None = None
    email: str | None = None
    notes: str | None = None
    category: str
    is_vip: bool
    is_blocked: bool
    block_reason: str | None = None
    ai_temperament_preset: str | None = None
    ai_greeting_template: str | None = None
    ai_swearing_rule: str | None = None
    ai_max_call_length_seconds: int | None = None
    has_custom_greeting: bool = False
    has_custom_instructions: bool = False
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContactListResponse(BaseModel):
    items: list[ContactResponse]
    total: int


class CategoryDefaultsRequest(BaseModel):
    defaults: dict[str, dict]

    @field_validator("defaults")
    @classmethod
    def validate_defaults(cls, v: dict) -> dict:
        for cat in v:
            _validate_category_slug(cat)
            inner = v[cat]
            if "temperament_preset" in inner and inner["temperament_preset"] not in _TEMPERAMENTS:
                raise ValueError(f"Invalid temperament_preset in {cat}")
            if "swearing_rule" in inner and inner["swearing_rule"] not in _SWEARING_RULES:
                raise ValueError(f"Invalid swearing_rule in {cat}")
            if (
                "greeting_template" in inner
                and inner["greeting_template"] not in _GREETING_TEMPLATES
            ):
                raise ValueError(f"Invalid greeting_template in {cat}")
        return v


class CategoryDefaultsResponse(BaseModel):
    defaults: dict[str, dict]


class CustomCategoryCreateRequest(BaseModel):
    slug: str
    label: str

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str) -> str:
        return _validate_category_slug(v)

    @field_validator("label")
    @classmethod
    def validate_label(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 60:
            raise ValueError("Label must be 1-60 characters")
        return v


class CategoryItem(BaseModel):
    slug: str
    label: str
    is_default: bool


class CategoriesListResponse(BaseModel):
    categories: list[CategoryItem]

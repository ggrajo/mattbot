# Source Generated with Decompyle++
# File: contacts.pyc (Python 3.13)

__doc__ = 'Pydantic schemas for contact profile endpoints.'
from __future__ import annotations

DEFAULT_CATEGORIES: set[str] = {
    'other',
    'family',
    'clients',
    'friends',
    'vendors',
    'business',
    'colleagues',
    'healthcare',
    'acquaintances'}
_SLUG_RE = None('^[a-z][a-z0-9_]{0,49}$')
_TEMPERAMENTS = {
    'custom',
    'formal',
    'casual_friendly',
    'short_and_direct',
    'professional_polite',
    'warm_and_supportive'}
_SWEARING_RULES = {
    'allow',
    'no_swearing',
    'mirror_caller'}
_GREETING_TEMPLATES = {
    'brief',
    'custom',
    'formal',
    'standard'}
# WARNING: Decompyle incomplete

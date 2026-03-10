# Source Generated with Decompyle++
# File: messaging.pyc (Python 3.13)

__doc__ = 'Pydantic schemas for messaging / text-back endpoints.'
from __future__ import annotations
import re
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
_E164_RE = None('^\\+[1-9]\\d{1,14}$')
# WARNING: Decompyle incomplete

# Source Generated with Decompyle++
# File: run.pyc (Python 3.13)

__doc__ = 'Worker runner entry point.\n\nUsage: python -m app.workers.run\n\nRuns polling loops for:\n- Post-call artifact processing (every 15 seconds)\n- Reminder due-date poller (every 60 seconds)\n- SMS send worker (every 30 seconds)\n- Number lifecycle tasks (every 5 minutes)\n- Retention enforcement (every 30 minutes)\n- Hard deletion (every 1 hour)\n'
from __future__ import annotations
import asyncio
import logging
import signal
import sys
from app.config import settings
# WARNING: Decompyle incomplete

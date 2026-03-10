# Source Generated with Decompyle++
# File: hard_deletion_worker.pyc (Python 3.13)

__doc__ = 'Hard deletion worker.\n\nPermanently removes call rows (and cascaded children) that have been\nsoft-deleted for more than 7 days.\n'
from __future__ import annotations

logger = None(__name__)
HARD_DELETE_GRACE_DAYS = 7
# WARNING: Decompyle incomplete

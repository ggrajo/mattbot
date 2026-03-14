"""Post-call artifact pipeline: AI sessions, transcripts, summaries, labels, memory."""

from __future__ import annotations

import logging
import math
import re as _re
import uuid
from datetime import UTC, datetime

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings as app_settings
from app.core.clock import utcnow
from app.core.encryption import decrypt_field, encrypt_field
from app.models.call import Call
from app.models.call_ai_session import CallAiSession
from app.models.call_artifact import CallArtifact
from app.models.call_memory_item import CallMemoryItem
from app.models.user_settings import UserSettings
from app.services import audit_service, billing_service

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# AI session helpers
# ---------------------------------------------------------------------------


async def create_ai_session(
    db: AsyncSession,
    call_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    status: str = "pending",
    provider_session_id: str | None = None,
) -> CallAiSession:
    """Create an AI session record (idempotent by call_id)."""
    existing = (
        await db.execute(select(CallAiSession).where(CallAiSession.call_id == call_id))
    ).scalar_one_or_none()

    if existing is not None:
        if provider_session_id:
            existing.provider_session_id = provider_session_id
        if status:
            existing.status = status
        existing.started_at = existing.started_at or utcnow()
        await db.flush()
        return existing

    session = CallAiSession(
        call_id=call_id,
        owner_user_id=user_id,
        status=status,
        provider_session_id=provider_session_id,
        agent_id=app_settings.ELEVENLABS_AGENT_ID or None,
        started_at=utcnow(),
    )
    db.add(session)
    await db.flush()
    return session


async def update_ai_session(
    db: AsyncSession,
    call_id: uuid.UUID,
    status: str,
    *,
    provider_session_id: str | None = None,
    ended_at: datetime | None = None,
    duration_seconds: int | None = None,
    last_error_redacted: str | None = None,
) -> CallAiSession | None:
    """Update AI session fields."""
    session = (
        await db.execute(select(CallAiSession).where(CallAiSession.call_id == call_id))
    ).scalar_one_or_none()

    if session is None:
        return None

    session.status = status
    if provider_session_id:
        session.provider_session_id = provider_session_id
    if ended_at:
        session.ended_at = ended_at
    if duration_seconds is not None:
        session.duration_seconds = duration_seconds
    if last_error_redacted:
        session.last_error_redacted = last_error_redacted

    await db.flush()
    return session


async def find_ai_session_by_provider_id(
    db: AsyncSession,
    provider_session_id: str,
) -> CallAiSession | None:
    """Look up AI session by ElevenLabs conversation_id."""
    if not provider_session_id:
        return None
    stmt = select(CallAiSession).where(CallAiSession.provider_session_id == provider_session_id)
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Artifact CRUD
# ---------------------------------------------------------------------------


async def get_or_create_artifact(
    db: AsyncSession,
    call_id: uuid.UUID,
    user_id: uuid.UUID,
    *,
    conversation_id: str | None = None,
) -> CallArtifact:
    """Get or create artifact record (idempotent by call_id)."""
    existing = (
        await db.execute(select(CallArtifact).where(CallArtifact.call_id == call_id))
    ).scalar_one_or_none()

    if existing is not None:
        return existing

    artifact = CallArtifact(
        call_id=call_id,
        owner_user_id=user_id,
        transcript_provider_ref=conversation_id,
        idempotency_key=f"artifact:{call_id}",
    )
    db.add(artifact)
    await db.flush()
    return artifact


async def get_artifact_for_user(
    db: AsyncSession,
    user_id: uuid.UUID,
    call_id: uuid.UUID,
) -> CallArtifact | None:
    """Get artifact, user-isolated."""
    stmt = select(CallArtifact).where(
        CallArtifact.call_id == call_id,
        CallArtifact.owner_user_id == user_id,
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


# ---------------------------------------------------------------------------
# Trigger
# ---------------------------------------------------------------------------


async def trigger_post_call_processing(
    db: AsyncSession,
    call_id: uuid.UUID,
    user_id: uuid.UUID,
    conversation_id: str,
) -> None:
    """Initialize artifact record for post-call processing by the worker."""
    artifact = await get_or_create_artifact(
        db,
        call_id=call_id,
        user_id=user_id,
        conversation_id=conversation_id,
    )

    if artifact.transcript_status == "pending":
        artifact.transcript_status = "processing"
    if artifact.summary_status == "pending":
        artifact.summary_status = "processing"
    if artifact.labels_status == "pending":
        artifact.labels_status = "processing"

    await db.flush()


# ---------------------------------------------------------------------------
# ElevenLabs transcript fetching
# ---------------------------------------------------------------------------


async def fetch_transcript_from_provider(
    conversation_id: str,
) -> dict[str, object] | None:
    """Fetch transcript from ElevenLabs. Returns parsed JSON or None if not ready."""
    api_key = app_settings.ELEVENLABS_API_KEY
    if not api_key:
        logger.warning("ELEVENLABS_API_KEY not configured, skipping transcript fetch")
        return None

    url = f"{app_settings.ELEVENLABS_API_BASE_URL}/{conversation_id}"
    headers = {"xi-api-key": api_key}

    try:
        async with httpx.AsyncClient(timeout=app_settings.ELEVENLABS_TRANSCRIPT_TIMEOUT) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                return data
            if resp.status_code in (404, 202):
                return None
            logger.warning(
                "ElevenLabs transcript fetch returned %d for %s",
                resp.status_code,
                conversation_id[:12],
            )
            return None
    except httpx.HTTPError:
        logger.exception("ElevenLabs transcript fetch error for %s", conversation_id[:12])
        return None


def _extract_transcript_text(el_data: dict) -> list[dict]:
    """Extract transcript turns from ElevenLabs conversation data."""
    transcript = el_data.get("transcript", [])
    if not transcript:
        analysis = el_data.get("analysis")
        if analysis and isinstance(analysis, dict):
            transcript = analysis.get("transcript", [])

    turns: list[dict] = []
    for entry in transcript:
        role = entry.get("role", "unknown")
        message = entry.get("message", "")
        time_in_call = entry.get("time_in_call_secs", 0)
        if not message:
            continue
        turns.append({"role": role, "text": message, "time_seconds": time_in_call})

    return turns


# ---------------------------------------------------------------------------
# Regex patterns for extraction
# ---------------------------------------------------------------------------

_NAME_FROM_TRANSCRIPT_RE = _re.compile(
    r"(?:my\s+name\s+is|this\s+is|i'?m|i\s+am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)",
    _re.IGNORECASE,
)

_NAME_FROM_SUMMARY_RE = _re.compile(
    r"^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*[,.]",
)

_BAD_CALLER_NAMES = {
    "a", "an", "the", "this", "that", "our", "their", "we", "my", "me",
    "caller", "unknown", "someone", "person", "customer", "user", "guest",
    "related to", "calling about", "calling for", "looking for", "asking about",
    "interested in", "inquiring about", "reaching out", "following up",
    "not provided", "n/a", "na", "none", "null", "undefined", "anonymous",
}


def _is_valid_caller_name(name: str) -> bool:
    """Check if extracted text looks like a real person name."""
    if not name or len(name) < 2 or len(name) > 60:
        return False
    lowered = name.strip().lower()
    if lowered in _BAD_CALLER_NAMES:
        return False
    if any(lowered.startswith(phrase) for phrase in (
        "related to", "calling about", "calling for", "looking for",
        "asking about", "interested in", "inquiring about", "reaching out",
        "following up", "not provided",
    )):
        return False
    words = name.split()
    if len(words) > 4:
        return False
    if not any(c.isalpha() for c in name):
        return False
    return True


_REASON_FROM_SUMMARY_RE = _re.compile(
    r"(?:regarding|about|because of|reason(?::\s*|\s+(?:is|was)\s+))\s*(.{5,120}?)(?:\.|$)",
    _re.IGNORECASE,
)

_PHONE_RE = _re.compile(
    r"(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}",
)


def _extract_from_transcript(
    transcript_turns: list[dict],
    summary_text: str,
) -> dict[str, str]:
    """Best-effort extraction of caller_name, reason, callback_phone, and
    urgency_text from transcript turns and the ElevenLabs summary."""
    result: dict[str, str] = {}

    caller_texts = [
        t["text"]
        for t in transcript_turns
        if t.get("role") in ("user", "caller") and t.get("text", "").strip()
    ]

    all_caller = " ".join(caller_texts)

    for txt in caller_texts[:5]:
        m = _NAME_FROM_TRANSCRIPT_RE.search(txt)
        if not m:
            continue
        candidate = m.group(1).strip()
        if _is_valid_caller_name(candidate):
            result["caller_name"] = candidate
            break

    if "caller_name" not in result and summary_text:
        m = _NAME_FROM_SUMMARY_RE.search(summary_text.strip())
        if m:
            candidate = m.group(1).strip()
            if _is_valid_caller_name(candidate):
                result["caller_name"] = candidate

    if summary_text:
        m = _REASON_FROM_SUMMARY_RE.search(summary_text)
        if m:
            result["reason"] = m.group(1).strip().rstrip(".")

    for txt in caller_texts:
        m = _PHONE_RE.search(txt)
        if not m:
            continue
        result["callback_phone"] = m.group(0).strip()
        break

    urgency_words = {"urgent", "emergency", "asap", "immediately", "right away", "urgently"}
    combined = (all_caller + " " + summary_text).lower()
    for w in urgency_words:
        if w in combined:
            result["urgency_text"] = "urgent"
            break

    return result


# ---------------------------------------------------------------------------
# Summary generation
# ---------------------------------------------------------------------------


def generate_summary_from_transcript(
    transcript_turns: list[dict],
    el_data: dict | None = None,
) -> tuple[str, dict]:
    """Generate summary text and structured extraction from transcript.

    Prefers the ElevenLabs-generated conversation summary when available,
    falling back to a narrative built from transcript content.

    Returns (summary_text, structured_extraction).
    """
    analysis: dict = {}
    if el_data:
        analysis = el_data.get("analysis", {})

    el_summary_fields = analysis.get("data_collection_results", {}) if analysis else {}

    raw_caller_name = el_summary_fields.get("caller_name", {}).get("value", "")
    caller_name = raw_caller_name if _is_valid_caller_name(raw_caller_name) else ""
    reason = el_summary_fields.get("reason_for_calling", {}).get("value", "")
    callback_phone = el_summary_fields.get("callback_number", {}).get("value", "")
    urgency_text = el_summary_fields.get("urgency_level", {}).get("value", "")

    el_transcript_summary = (
        analysis.get("transcript_summary")
        or analysis.get("call_summary")
        or analysis.get("summary")
    )

    if not (caller_name and reason):
        inferred = _extract_from_transcript(transcript_turns, el_transcript_summary or "")
        if not caller_name:
            inferred_name = inferred.get("caller_name", "")
            caller_name = inferred_name if _is_valid_caller_name(inferred_name) else ""
        if not reason:
            reason = inferred.get("reason", "")
        if not callback_phone:
            callback_phone = inferred.get("callback_phone", "")
        if not urgency_text:
            urgency_text = inferred.get("urgency_text", "")

    urgency_level = _classify_urgency(urgency_text, transcript_turns)

    if (
        el_transcript_summary
        and isinstance(el_transcript_summary, str)
        and el_transcript_summary.strip()
    ):
        summary_text = el_transcript_summary.strip()
    else:
        summary_text = _build_el_fallback_summary(
            transcript_turns,
            caller_name,
            reason,
            call_successful=analysis.get("call_successful"),
        )

    structured = {
        "caller_name": caller_name,
        "callback_phone_e164": callback_phone,
        "reason": reason,
        "urgency_level": urgency_level,
        "requested_action": el_summary_fields.get("requested_action", {}).get("value", ""),
        "best_callback_window": el_summary_fields.get("best_callback_time", {}).get("value", ""),
    }

    return summary_text, structured


def _build_el_fallback_summary(
    transcript_turns: list[dict],
    caller_name: str,
    reason: str,
    *,
    call_successful: bool | None = None,
) -> str:
    """Minimal fallback when ElevenLabs provides no summary."""
    caller_messages = [
        t["text"].strip()
        for t in transcript_turns
        if t["role"] in ("user", "caller") and t["text"].strip() not in ("", "...")
    ]

    agent_messages = [
        t["text"].strip() for t in transcript_turns if t["role"] == "agent" and t["text"].strip()
    ]

    who = caller_name or "An unknown caller"

    if not caller_messages and not agent_messages:
        return f"{who} called but no conversation took place."

    if not caller_messages:
        return (
            f"{who} called but did not respond. The assistant attempted to greet them "
            f"but the caller was silent or hung up."
        )

    if reason:
        return f"{who} called regarding: {reason}."

    snippet = caller_messages[0][:150].rstrip(".")
    return f'{who} called and said: "{snippet}."'


# ---------------------------------------------------------------------------
# Urgency classification
# ---------------------------------------------------------------------------


def _classify_urgency(urgency_text: str, transcript_turns: list[dict]) -> str:
    """Classify urgency level from AI analysis or transcript cues."""
    if urgency_text:
        low = urgency_text.lower()
        if "urgent" in low or "emergency" in low or "asap" in low:
            return "urgent"
        if "low" in low:
            return "low"
        return "normal"

    all_text = " ".join(t["text"].lower() for t in transcript_turns)
    urgent_keywords = [
        "urgent",
        "emergency",
        "asap",
        "immediately",
        "right away",
        "critical",
        "hospital",
        "ambulance",
    ]

    if any(kw in all_text for kw in urgent_keywords):
        return "urgent"

    return "normal"


# ---------------------------------------------------------------------------
# Label computation
# ---------------------------------------------------------------------------


_SPAM_KEYWORDS = [
    "warranty", "you have been selected", "press 1", "robo",
    "congratulations you've won", "free offer", "irs", "social security",
    "auto warranty", "extended warranty", "your account has been",
    "you've been chosen", "claim your prize", "act now", "limited time",
    "final notice", "this is an automated", "press one", "press nine",
    "do not hang up", "your car's warranty", "debt relief",
    "credit card rate", "lower your interest", "free vacation",
    "you have won", "verify your account", "suspicious activity on your",
    "we are calling about your", "this call is being recorded for quality",
]

_SALES_KEYWORDS = [
    "special offer", "discount", "promotion", "subscription",
    "service we offer", "quote for you", "pricing", "package deal",
    "sign up today", "free trial", "no obligation",
]

_GENERIC_CALLER_NAMES = {
    "representative", "agent", "customer service", "department",
    "support", "operator", "associate", "specialist", "",
}


def _compute_spam_score(
    all_text: str,
    transcript_turns: list[dict],
    structured_extraction: dict,
    el_data: dict | None,
    call_duration_seconds: int | None,
    prior_spam_count: int,
    is_vip: bool,
) -> tuple[float, list[str], list[str]]:
    """Multi-signal spam scorer. Returns (score, reasons, evidence_snippets).

    Signals and weights:
      - Keyword patterns:    0.30
      - Behavioral signals:  0.25
      - AI extraction:       0.25
      - Repeat offender:     0.20
    """
    if is_vip:
        return 0.0, [], []

    keyword_score = 0.0
    behavior_score = 0.0
    ai_score = 0.0
    repeat_score = 0.0
    reasons: list[str] = []
    evidence: list[str] = []

    # --- Keyword patterns (weight 0.30) ---
    spam_hits = [kw for kw in _SPAM_KEYWORDS if kw in all_text]
    if spam_hits:
        keyword_score = min(1.0, len(spam_hits) * 0.35)
        reasons.append(f"Matched {len(spam_hits)} spam keyword(s): {', '.join(spam_hits[:3])}")
        evidence.extend(
            t["text"][:120] for t in transcript_turns
            if any(kw in t["text"].lower() for kw in spam_hits)
        )

    # --- Behavioral signals (weight 0.25) ---
    caller_name = (structured_extraction.get("caller_name") or "").strip().lower()
    reason_for_call = (structured_extraction.get("reason") or structured_extraction.get("reason_for_call") or "").strip()
    no_name = not caller_name or caller_name in _GENERIC_CALLER_NAMES
    no_reason = len(reason_for_call) < 5

    if no_name and no_reason:
        behavior_score = 0.9
        reasons.append("Caller refused to provide name and reason")
    elif no_name:
        behavior_score = 0.5
        reasons.append("Caller did not provide a name")
    elif no_reason:
        behavior_score = 0.3
        reasons.append("Caller did not provide a clear reason")

    if call_duration_seconds is not None and call_duration_seconds < 15 and no_name:
        behavior_score = max(behavior_score, 0.8)
        reasons.append(f"Very short call ({call_duration_seconds}s) with no identification")

    user_turns = [t for t in transcript_turns if t.get("role") == "user"]
    if not user_turns and len(transcript_turns) > 2:
        behavior_score = max(behavior_score, 0.7)
        reasons.append("No caller speech detected (possible robocall)")

    # --- AI extraction signals (weight 0.25) ---
    el_analysis = {}
    if el_data and isinstance(el_data.get("analysis"), dict):
        el_analysis = el_data["analysis"]
        dc = el_analysis.get("data_collection_results") or {}
        if isinstance(dc, dict):
            ai_reason = (dc.get("reason_for_call") or dc.get("reason") or "").strip().lower()
            ai_name = (dc.get("caller_name") or "").strip().lower()
            if (not ai_name or ai_name in _GENERIC_CALLER_NAMES) and not ai_reason:
                ai_score = 0.7
                reasons.append("AI could not extract caller identity or purpose")
            elif not ai_reason:
                ai_score = 0.3

    urgency = structured_extraction.get("urgency_level", "normal")
    if urgency == "normal" and no_name and no_reason:
        ai_score = max(ai_score, 0.6)

    # --- Repeat offender (weight 0.20) ---
    if prior_spam_count >= 3:
        repeat_score = 1.0
        reasons.append(f"Repeat spam caller ({prior_spam_count} prior flags)")
    elif prior_spam_count >= 1:
        repeat_score = 0.6 + (prior_spam_count * 0.15)
        reasons.append(f"Previously flagged as spam ({prior_spam_count}x)")

    weighted = (
        keyword_score * 0.30
        + behavior_score * 0.25
        + ai_score * 0.25
        + repeat_score * 0.20
    )

    return round(min(1.0, weighted), 3), reasons[:5], evidence[:3]


async def compute_labels(
    db: AsyncSession,
    caller_phone_hash: str,
    owner_user_id: uuid.UUID,
    transcript_turns: list[dict],
    structured_extraction: dict,
    el_data: dict | None = None,
    call_duration_seconds: int | None = None,
    spam_labeling_enabled: bool = True,
) -> list[dict]:
    """Compute call labels with reasons and evidence, including multi-signal spam scoring."""
    labels: list[dict] = []
    urgency = structured_extraction.get("urgency_level", "normal")

    all_text = " ".join(t["text"].lower() for t in transcript_turns)

    if urgency == "urgent":
        evidence = [
            t["text"][:100]
            for t in transcript_turns
            if any(kw in t["text"].lower() for kw in ("urgent", "emergency", "asap"))
        ][:3]
        labels.append(
            {
                "label_name": "urgent",
                "reason_text": "Caller indicated urgency",
                "evidence_snippets": evidence,
                "confidence": 0.85,
                "produced_by": "ai_assisted",
            }
        )

    # --- Spam scoring ---
    if spam_labeling_enabled:
        from app.models.vip_entry import VipEntry

        is_vip = False
        prior_spam_count = 0

        if caller_phone_hash:
            vip_row = (await db.execute(
                select(VipEntry.id).where(
                    VipEntry.owner_user_id == owner_user_id,
                    VipEntry.phone_hash == caller_phone_hash,
                ).limit(1)
            )).scalar_one_or_none()
            is_vip = vip_row is not None

            try:
                from app.models.spam_entry import SpamEntry
                spam_row = (await db.execute(
                    select(SpamEntry.spam_call_count).where(
                        SpamEntry.owner_user_id == owner_user_id,
                        SpamEntry.phone_hash == caller_phone_hash,
                    )
                )).scalar_one_or_none()
                prior_spam_count = spam_row or 0
            except Exception:
                pass

        spam_score, spam_reasons, spam_evidence = _compute_spam_score(
            all_text, transcript_turns, structured_extraction, el_data,
            call_duration_seconds, prior_spam_count, is_vip,
        )

        if spam_score >= 0.7:
            labels.append({
                "label_name": "spam",
                "reason_text": "; ".join(spam_reasons) or "Call matches spam patterns",
                "evidence_snippets": spam_evidence,
                "confidence": spam_score,
                "spam_score": spam_score,
                "produced_by": "ai_assisted",
            })
        elif spam_score >= 0.4:
            labels.append({
                "label_name": "possible_spam",
                "reason_text": "; ".join(spam_reasons) or "Call shows some spam indicators",
                "evidence_snippets": spam_evidence,
                "confidence": spam_score,
                "spam_score": spam_score,
                "produced_by": "ai_assisted",
            })

    # --- Sales detection ---
    if not any(l["label_name"] in ("spam", "possible_spam") for l in labels):
        if any(kw in all_text for kw in _SALES_KEYWORDS):
            evidence = [
                t["text"][:100]
                for t in transcript_turns
                if any(kw in t["text"].lower() for kw in _SALES_KEYWORDS)
            ][:3]
            labels.append({
                "label_name": "sales",
                "reason_text": "Caller appears to be selling a product or service",
                "evidence_snippets": evidence,
                "confidence": 0.7,
                "produced_by": "deterministic",
            })

    if not labels:
        labels.append({
            "label_name": "normal",
            "reason_text": "Standard call with no special classification",
            "evidence_snippets": [],
            "confidence": 0.9,
            "produced_by": "deterministic",
        })

    return labels


# ---------------------------------------------------------------------------
# Relationship / communication preference keywords
# ---------------------------------------------------------------------------

_RELATIONSHIP_KEYWORDS: dict[str, list[str]] = {
    "client": ["client", "customer", "account", "project we're working on", "our contract"],
    "vendor": ["vendor", "supplier", "invoice", "payment due", "deliver"],
    "colleague": ["colleague", "coworker", "from the office", "same team", "department"],
    "friend": ["friend", "buddy", "pal", "we go way back", "personally"],
    "family": [
        "family",
        "brother",
        "sister",
        "mom",
        "dad",
        "son",
        "daughter",
        "wife",
        "husband",
        "spouse",
    ],
    "recruiter": ["recruiter", "hiring", "job opportunity", "position", "opening"],
    "partner": ["partner", "partnership", "joint venture", "collaboration"],
}

_COMM_PREF_KEYWORDS: dict[str, list[str]] = {
    "prefers email": [
        "email me",
        "send an email",
        "email is best",
        "via email",
        "reach me by email",
    ],
    "prefers text": ["text me", "send a text", "text is best", "sms", "reach me by text"],
    "prefers call": ["call me back", "give me a call", "call is best", "phone call"],
}


def _infer_relationship(transcript_turns: list[dict]) -> str | None:
    """Infer caller relationship from transcript keywords."""
    all_caller_text = " ".join(
        t["text"].lower() for t in transcript_turns if t.get("role") in ("user", "caller")
    )
    if not all_caller_text:
        return None

    for tag, keywords in _RELATIONSHIP_KEYWORDS.items():
        if any(kw in all_caller_text for kw in keywords):
            return tag

    return None


def _infer_communication_preference(transcript_turns: list[dict]) -> str | None:
    """Infer how the caller prefers to be contacted."""
    all_caller_text = " ".join(
        t["text"].lower() for t in transcript_turns if t.get("role") in ("user", "caller")
    )
    if not all_caller_text:
        return None

    for pref, keywords in _COMM_PREF_KEYWORDS.items():
        if any(kw in all_caller_text for kw in keywords):
            return pref

    return None


# ---------------------------------------------------------------------------
# Repeated-reason detection
# ---------------------------------------------------------------------------


async def _detect_repeated_reason(
    db: AsyncSession,
    user_id: uuid.UUID,
    caller_phone_hash: str,
    current_reason: str,
) -> str | None:
    """Detect a repeated calling pattern by comparing with past call reasons."""
    if not current_reason or not caller_phone_hash:
        return None

    stmt = (
        select(CallMemoryItem)
        .where(
            CallMemoryItem.owner_user_id == user_id,
            CallMemoryItem.caller_phone_hash == caller_phone_hash,
            CallMemoryItem.memory_type == "repeated_reason_pattern",
            CallMemoryItem.deleted_at.is_(None),
        )
        .limit(1)
    )
    result = await db.execute(stmt)
    if result.scalar_one_or_none() is not None:
        return None

    from app.models.call import Call
    from app.models.call_artifact import CallArtifact

    stmt = (
        select(CallArtifact.structured_extraction)
        .join(Call, CallArtifact.call_id == Call.id)
        .where(
            Call.owner_user_id == user_id,
            Call.caller_phone_hash == caller_phone_hash,
            Call.deleted_at.is_(None),
        )
        .order_by(Call.started_at.desc())
        .limit(10)
    )
    result = await db.execute(stmt)

    past_reasons = [
        row[0].get("reason", "").lower().strip()
        for row in result.all()
        if row[0] and row[0].get("reason")
    ]

    current_lower = current_reason.lower().strip()
    matching = sum(1 for r in past_reasons if _reasons_similar(current_lower, r))

    if matching >= 2:
        return f"frequently calls about: {current_reason}"
    return None


def _reasons_similar(a: str, b: str) -> bool:
    """Simple overlap check: >50% word overlap means similar reasons."""
    words_a = set(a.split())
    words_b = set(b.split())
    if not words_a or not words_b:
        return False
    overlap = len(words_a & words_b)
    return overlap / min(len(words_a), len(words_b)) > 0.5


# ---------------------------------------------------------------------------
# Memory items
# ---------------------------------------------------------------------------


async def create_memory_items(
    db: AsyncSession,
    user_id: uuid.UUID,
    call_id: uuid.UUID,
    *,
    caller_phone_hash: str | None = None,
    structured_extraction: dict,
    transcript_turns: list[dict] | None = None,
) -> list[CallMemoryItem]:
    """Create memory items from structured extraction and transcript analysis."""
    settings_row = (
        await db.execute(select(UserSettings).where(UserSettings.owner_user_id == user_id))
    ).scalar_one_or_none()

    if not settings_row or not settings_row.memory_enabled:
        return []

    items: list[CallMemoryItem] = []
    turns = transcript_turns or []

    def _make_item(memory_type: str, subject: str, value: str, confidence: float) -> CallMemoryItem:
        ct, nonce, kv = encrypt_field(value.encode("utf-8"))
        return CallMemoryItem(
            owner_user_id=user_id,
            source_call_id=call_id,
            caller_phone_hash=caller_phone_hash,
            memory_type=memory_type,
            subject=subject[:50],
            value_ciphertext=ct,
            value_nonce=nonce,
            value_key_version=kv,
            confidence=confidence,
        )

    existing_by_type: dict = {}
    if caller_phone_hash:
        ex_stmt = select(CallMemoryItem).where(
            CallMemoryItem.owner_user_id == user_id,
            CallMemoryItem.caller_phone_hash == caller_phone_hash,
            CallMemoryItem.deleted_at.is_(None),
        )
        ex_result = await db.execute(ex_stmt)
        for row in ex_result.scalars().all():
            existing_by_type[row.memory_type] = row

    async def _upsert(
        memory_type: str, subject: str, value: str, confidence: float
    ) -> CallMemoryItem | None:
        existing = existing_by_type.get(memory_type)
        if existing:
            if existing.user_confirmed:
                return None
            if existing.confidence is not None and confidence <= (existing.confidence or 0):
                return None
            ct, nonce, kv = encrypt_field(value.encode("utf-8"))
            existing.subject = subject[:50]
            existing.value_ciphertext = ct
            existing.value_nonce = nonce
            existing.value_key_version = kv
            existing.confidence = confidence
            existing.source_call_id = call_id
            return existing
        item = _make_item(memory_type, subject, value, confidence)
        db.add(item)
        return item

    caller_name = structured_extraction.get("caller_name", "")
    if caller_name:
        skip_name = False
        if caller_phone_hash:
            from app.models.contact_profile import ContactProfile
            contact = (await db.execute(
                select(ContactProfile).where(
                    ContactProfile.owner_user_id == user_id,
                    ContactProfile.phone_hash == caller_phone_hash,
                    ContactProfile.deleted_at.is_(None),
                )
            )).scalar_one_or_none()
            if contact and contact.display_name:
                skip_name = True

        if not skip_name:
            result = await _upsert("caller_display_name", caller_name, caller_name, 0.8)
            if result:
                items.append(result)

    callback_window = structured_extraction.get("best_callback_window", "")
    if callback_window:
        result = await _upsert(
            "callback_window_preference", "Preferred callback time", callback_window, 0.7
        )
        if result:
            items.append(result)

    relationship = _infer_relationship(turns)
    if relationship:
        result = await _upsert("relationship_tag", "Relationship", relationship, 0.6)
        if result:
            items.append(result)

    comm_pref = _infer_communication_preference(turns)
    if comm_pref:
        result = await _upsert("communication_preference", "Contact preference", comm_pref, 0.65)
        if result:
            items.append(result)

    reason = structured_extraction.get("reason", "")
    if caller_phone_hash and reason:
        pattern = await _detect_repeated_reason(db, user_id, caller_phone_hash, reason)
        if pattern:
            result = await _upsert("repeated_reason_pattern", "Calling pattern", pattern, 0.7)
            if result:
                items.append(result)

    if items:
        await db.flush()

    return items


# ---------------------------------------------------------------------------
# Spam registration
# ---------------------------------------------------------------------------


async def _register_spam_caller(
    db: AsyncSession,
    user_id: uuid.UUID,
    caller_phone_hash: str,
    from_masked: str,
    spam_score: float,
) -> None:
    """Upsert a SpamEntry and optionally auto-block if threshold reached."""
    try:
        from app.models.spam_entry import SpamEntry
    except ImportError:
        logger.debug("SpamEntry model not yet available, skipping registration")
        return

    existing = (await db.execute(
        select(SpamEntry).where(
            SpamEntry.owner_user_id == user_id,
            SpamEntry.phone_hash == caller_phone_hash,
        )
    )).scalar_one_or_none()

    now = utcnow()
    if existing:
        existing.spam_call_count += 1
        existing.spam_score = round(
            (existing.spam_score * (existing.spam_call_count - 1) + spam_score)
            / existing.spam_call_count, 3
        )
        existing.last_flagged_at = now
    else:
        phone_last4 = from_masked[-4:] if len(from_masked) >= 4 else from_masked
        entry = SpamEntry(
            owner_user_id=user_id,
            phone_hash=caller_phone_hash,
            phone_last4=phone_last4,
            spam_score=spam_score,
            spam_call_count=1,
            first_flagged_at=now,
            last_flagged_at=now,
            auto_blocked=False,
            source="auto",
        )
        db.add(entry)
        existing = entry

    await db.flush()

    settings_row = (
        await db.execute(select(UserSettings).where(UserSettings.owner_user_id == user_id))
    ).scalar_one_or_none()

    if (
        settings_row
        and getattr(settings_row, "auto_block_spam", False)
        and existing.spam_call_count >= getattr(settings_row, "spam_block_threshold", 2)
        and not existing.auto_blocked
    ):
        from app.models.block_entry import BlockEntry

        already_blocked = (await db.execute(
            select(BlockEntry.id).where(
                BlockEntry.owner_user_id == user_id,
                BlockEntry.phone_hash == caller_phone_hash,
            ).limit(1)
        )).scalar_one_or_none()

        if not already_blocked:
            block = BlockEntry(
                owner_user_id=user_id,
                phone_hash=caller_phone_hash,
                phone_last4=existing.phone_last4,
                reason="auto_spam",
            )
            db.add(block)
        existing.auto_blocked = True
        await db.flush()
        logger.info(
            "Auto-blocked spam caller %s for user %s (count=%d)",
            caller_phone_hash[:8], str(user_id)[:8], existing.spam_call_count,
        )


# ---------------------------------------------------------------------------
# Main processing pipeline
# ---------------------------------------------------------------------------


async def process_call_artifacts(
    db: AsyncSession,
    artifact: CallArtifact,
) -> bool:
    """Process a single call's artifacts. Returns True if all complete."""
    conversation_id = artifact.transcript_provider_ref
    call_id = artifact.call_id
    user_id = artifact.owner_user_id

    call = await db.get(Call, call_id)
    if call is None:
        logger.warning("Call %s not found for artifact processing", call_id)
        return False

    el_data = None
    transcript_turns: list[dict] = []

    # --- Transcript ---
    if artifact.transcript_status in ("processing", "pending") and conversation_id:
        el_data = await fetch_transcript_from_provider(conversation_id)
        artifact.transcript_last_checked_at = utcnow()

        if el_data:
            transcript_turns = _extract_transcript_text(el_data)
            artifact.transcript_status = "ready"
            call.missing_transcript = False

            if transcript_turns and not artifact.transcript_text_ciphertext:
                full_text = format_transcript_text(transcript_turns)
                if full_text:
                    ct, nonce, kv = encrypt_field(full_text.encode("utf-8"))
                    artifact.transcript_text_ciphertext = ct
                    artifact.transcript_text_nonce = nonce
                    artifact.transcript_text_key_version = kv
        else:
            artifact.transcript_status = "processing"
    elif artifact.transcript_status == "ready" and conversation_id:
        el_data = await fetch_transcript_from_provider(conversation_id)
        if el_data:
            transcript_turns = _extract_transcript_text(el_data)

            if transcript_turns and not artifact.transcript_text_ciphertext:
                full_text = format_transcript_text(transcript_turns)
                if full_text:
                    ct, nonce, kv = encrypt_field(full_text.encode("utf-8"))
                    artifact.transcript_text_ciphertext = ct
                    artifact.transcript_text_nonce = nonce
                    artifact.transcript_text_key_version = kv

    # --- Summary ---
    if artifact.summary_status in ("processing", "pending"):
        if transcript_turns or el_data:
            summary_text, structured = generate_summary_from_transcript(transcript_turns, el_data)
            ct, nonce, kv = encrypt_field(summary_text.encode("utf-8"))
            artifact.summary_text_ciphertext = ct
            artifact.summary_text_nonce = nonce
            artifact.summary_text_key_version = kv
            artifact.summary_status = "ready"
            artifact.structured_extraction = structured
            call.missing_summary = False
        elif artifact.transcript_status == "failed":
            artifact.summary_status = "failed"

    # --- Labels ---
    if artifact.labels_status in ("processing", "pending"):
        if transcript_turns or artifact.structured_extraction:
            extraction = artifact.structured_extraction or {}
            settings_row = (
                await db.execute(select(UserSettings).where(UserSettings.owner_user_id == user_id))
            ).scalar_one_or_none()
            spam_enabled = settings_row.spam_labeling_enabled if settings_row else True
            labels = await compute_labels(
                db,
                caller_phone_hash=call.caller_phone_hash or "",
                owner_user_id=user_id,
                transcript_turns=transcript_turns,
                structured_extraction=extraction,
                el_data=el_data,
                call_duration_seconds=call.duration_seconds,
                spam_labeling_enabled=spam_enabled,
            )
            artifact.labels_json = labels
            artifact.labels_status = "ready"
            call.missing_labels = False

            is_spam = any(
                lbl.get("label_name") in ("spam", "possible_spam") for lbl in labels
            )
            if is_spam and call.caller_phone_hash:
                spam_score = max(
                    (l.get("spam_score") or l.get("confidence", 0))
                    for l in labels
                    if l["label_name"] in ("spam", "possible_spam")
                )
                await _register_spam_caller(
                    db, user_id, call.caller_phone_hash,
                    call.from_masked or "",
                    spam_score=spam_score,
                )
        elif artifact.transcript_status == "failed":
            artifact.labels_status = "failed"

    # --- Billing ---
    duration = call.duration_seconds or 0
    if duration > 0:
        minutes = math.ceil(duration / 60)
        await billing_service.record_usage(
            db,
            user_id,
            minutes,
            source="call",
            idempotency_key=f"usage:{call_id}",
            call_id=call_id,
            duration_seconds=duration,
        )

    # --- Memory items ---
    if artifact.structured_extraction:
        await create_memory_items(
            db,
            user_id=user_id,
            call_id=call_id,
            caller_phone_hash=call.caller_phone_hash,
            structured_extraction=artifact.structured_extraction,
            transcript_turns=transcript_turns or None,
        )

    # --- Urgent notification ---
    is_urgent = any(lbl.get("label_name") == "urgent" for lbl in (artifact.labels_json or []))

    if is_urgent:
        logger.info(
            "Call %s classified as URGENT, checking notification settings",
            str(call_id)[:8],
        )
        try:
            from app.models.user import User
            from app.services.notification_service import dispatch_urgent_notifications

            us = (
                await db.execute(select(UserSettings).where(UserSettings.owner_user_id == user_id))
            ).scalar_one_or_none()

            if us and (us.urgent_notify_sms or us.urgent_notify_email or us.urgent_notify_call):
                user_row = await db.get(User, user_id)
                user_email = user_row.email if user_row else ""
                extraction = artifact.structured_extraction or {}
                caller_info = extraction.get("caller_name") or call.from_masked or "Unknown"
                summary_snippet = ""
                if artifact.summary_text_ciphertext:
                    summary_snippet = decrypt_summary(artifact) or ""
                logger.info(
                    "Dispatching urgent notifications for call %s (sms=%s email=%s call=%s)",
                    str(call_id)[:8],
                    us.urgent_notify_sms,
                    us.urgent_notify_email,
                    us.urgent_notify_call,
                )
                results = await dispatch_urgent_notifications(
                    db,
                    settings_row=us,
                    user_email=user_email,
                    caller_info=caller_info,
                    summary_snippet=summary_snippet[:200],
                    call_id=call_id,
                )
                logger.info(
                    "Urgent notification results for call %s: %s",
                    str(call_id)[:8],
                    results,
                )
            else:
                logger.info(
                    "Call %s is urgent but notifications "
                    "disabled (settings=%s, sms=%s, "
                    "email=%s, call=%s)",
                    str(call_id)[:8],
                    us is not None,
                    getattr(us, "urgent_notify_sms", None),
                    getattr(us, "urgent_notify_email", None),
                    getattr(us, "urgent_notify_call", None),
                )
        except Exception:
            logger.exception("Failed to dispatch urgent notifications for call %s", call_id)

    # --- Audit ---
    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="CALL_ARTIFACTS_PROCESSED",
        actor_type="system",
        target_type="call",
        target_id=call_id,
        details={
            "summary_status": artifact.summary_status,
            "labels_status": artifact.labels_status,
            "transcript_status": artifact.transcript_status,
        },
    )

    await db.flush()

    all_done = all(
        s in ("ready", "failed", "not_available")
        for s in (
            artifact.summary_status,
            artifact.labels_status,
            artifact.transcript_status,
        )
    )

    return all_done


# ---------------------------------------------------------------------------
# Proxy / formatting / decryption
# ---------------------------------------------------------------------------


async def proxy_transcript(conversation_id: str) -> dict | None:
    """Fetch and return transcript from ElevenLabs for client display."""
    el_data = await fetch_transcript_from_provider(conversation_id)
    if not el_data:
        return None

    turns = _extract_transcript_text(el_data)

    return {
        "conversation_id": conversation_id,
        "turns": turns,
        "turn_count": len(turns),
    }


def format_transcript_text(turns: list[dict]) -> str:
    """Format transcript turns into readable dialogue text."""
    lines: list[str] = []
    for turn in turns:
        role = turn.get("role", "unknown")
        text = turn.get("text", "")
        if not text:
            continue
        label = "Caller" if role == "user" else "Agent"
        lines.append(f"{label}: {text}")
    return "\n".join(lines)


def decrypt_transcript_text(artifact: CallArtifact) -> str | None:
    """Decrypt and return full transcript text."""
    if (
        artifact.transcript_text_ciphertext is None
        or artifact.transcript_text_nonce is None
        or artifact.transcript_text_key_version is None
    ):
        return None
    try:
        plaintext = decrypt_field(
            artifact.transcript_text_ciphertext,
            artifact.transcript_text_nonce,
            artifact.transcript_text_key_version,
        )
        return plaintext.decode("utf-8")
    except Exception:
        logger.warning("Failed to decrypt transcript text for artifact %s", artifact.id)
        return None


def decrypt_summary(artifact: CallArtifact) -> str | None:
    """Decrypt and return summary text."""
    if (
        artifact.summary_text_ciphertext is None
        or artifact.summary_text_nonce is None
        or artifact.summary_text_key_version is None
    ):
        return None
    try:
        plaintext = decrypt_field(
            artifact.summary_text_ciphertext,
            artifact.summary_text_nonce,
            artifact.summary_text_key_version,
        )
        return plaintext.decode("utf-8")
    except Exception:
        logger.exception("Failed to decrypt summary for artifact %s", artifact.id)
        return None


# ---------------------------------------------------------------------------
# Stale summary refresh
# ---------------------------------------------------------------------------

_STALE_SUMMARY_PATTERNS = [
    _re.compile(r"•\s*Caller said:", _re.IGNORECASE),
    _re.compile(r"•\s*Duration:\s*\d+\s*minute", _re.IGNORECASE),
    _re.compile(r'They said:\s*"\.{2,}"', _re.IGNORECASE),
    _re.compile(r"^A caller called\.\s*$", _re.IGNORECASE),
]


def _is_stale_summary(text: str) -> bool:
    """Detect old-format summaries that should be regenerated from ElevenLabs."""
    return any(p.search(text) for p in _STALE_SUMMARY_PATTERNS)


async def refresh_stale_summary(
    db: AsyncSession,
    artifact: CallArtifact,
    call: Call,
) -> str | None:
    """Re-fetch ElevenLabs data and regenerate the summary if the stored one
    matches an old template format.  Returns the new summary text or None."""
    session = (
        await db.execute(
            select(CallAiSession)
            .where(
                CallAiSession.call_id == call.id,
                CallAiSession.provider_session_id.isnot(None),
            )
            .order_by(CallAiSession.created_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    if not session or not session.provider_session_id:
        return None

    el_data = await fetch_transcript_from_provider(session.provider_session_id)
    if not el_data:
        return None

    transcript_turns = _extract_transcript_text(el_data)
    summary_text, structured = generate_summary_from_transcript(transcript_turns, el_data)

    ct, nonce, kv = encrypt_field(summary_text.encode("utf-8"))
    artifact.summary_text_ciphertext = ct
    artifact.summary_text_nonce = nonce
    artifact.summary_text_key_version = kv
    artifact.structured_extraction = structured

    if transcript_turns and not artifact.transcript_text_ciphertext:
        full_text = format_transcript_text(transcript_turns)
        if full_text:
            t_ct, t_nonce, t_kv = encrypt_field(full_text.encode("utf-8"))
            artifact.transcript_text_ciphertext = t_ct
            artifact.transcript_text_nonce = t_nonce
            artifact.transcript_text_key_version = t_kv

    await db.flush()

    return summary_text


def decrypt_notes(artifact: CallArtifact) -> str | None:
    """Decrypt and return user notes text."""
    if (
        artifact.notes_ciphertext is None
        or artifact.notes_nonce is None
        or artifact.notes_key_version is None
    ):
        return None
    try:
        plaintext = decrypt_field(
            artifact.notes_ciphertext,
            artifact.notes_nonce,
            artifact.notes_key_version,
        )
        return plaintext.decode("utf-8")
    except Exception:
        logger.exception("Failed to decrypt notes for artifact %s", artifact.id)
        return None

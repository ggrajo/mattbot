"""Webhook handlers for Stripe, Twilio, and ElevenLabs."""

from __future__ import annotations

import contextlib
import json
import logging
import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy import select as sa_select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings as app_settings
from app.core.rate_limiter import check_rate_limit, clear_rate_limit
from app.core.session_token import verify_elevenlabs_hmac
from app.core.twilio_utils import hash_phone, validate_twilio_signature
from app.database import get_db
from app.models.user_settings import UserSettings
from app.services import (
    agent_service,
    audit_service,
    billing_service,
    call_service,
    telephony_service,
)

logger = logging.getLogger(__name__)

router = APIRouter()


async def detect_forwarding_misconfiguration(
    db: AsyncSession,
    user_id: uuid.UUID,
    is_forwarded: bool,
) -> bool:
    """Track consecutive forwarded calls and create a notification if misconfigured.

    Uses the rate-limiter's Redis / in-memory backend to keep a lightweight
    counter per user.  Returns True if a misconfiguration notification was
    created during this call.
    """
    key = f"fwd_detect:{user_id}"

    if not is_forwarded:
        await clear_rate_limit(key)
        return False

    allowed, _ = await check_rate_limit(
        key,
        max_requests=app_settings.FWD_DETECT_THRESHOLD,
        window_seconds=app_settings.FWD_DETECT_WINDOW_SECONDS,
    )

    if allowed:
        return False

    from app.services.notification_service import create_and_enqueue_notification

    await create_and_enqueue_notification(
        db,
        owner_user_id=user_id,
        notification_type="call_processing_error",
        priority="high",
        source_entity_type="system_error",
    )

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="FORWARDING_MISCONFIGURATION_DETECTED",
        actor_type="system",
        details={
            "consecutive_forwarded_calls": app_settings.FWD_DETECT_THRESHOLD,
            "message": (
                "Multiple consecutive calls appear to be"
                " forwarded. Please check your call"
                " forwarding settings."
            ),
        },
    )

    await clear_rate_limit(key)
    logger.warning(
        "Forwarding misconfiguration detected for user %s",
        str(user_id)[:8],
    )

    return True


def _twiml_response(body: str, status_code: int = 200) -> Response:
    xml = f'<?xml version="1.0" encoding="UTF-8"?><Response>{body}</Response>'
    return Response(content=xml, media_type="application/xml", status_code=status_code)


_FALLBACK_TWIML = (
    '<Say voice="alice">Thank you for calling. The assistant is currently '
    "unavailable. Please try again later. Goodbye.</Say><Hangup/>"
)

_BILLING_INACTIVE_TWIML = (
    '<Say voice="alice">Thank you for calling. This service is currently '
    "unavailable due to account status. Please try again later. Goodbye.</Say><Hangup/>"
)

_NOT_IN_SERVICE_TWIML = (
    '<Say voice="alice">The number you have reached is not in service. Goodbye.</Say><Hangup/>'
)

_UNAUTHORIZED_TWIML = "<Say>Unauthorized.</Say><Hangup/>"

_FORWARDING_VERIFIED_TWIML = (
    '<Say voice="alice">Forwarding verified successfully. Goodbye.</Say><Hangup/>'
)

_STREAM_FALLBACK_SAY = (
    '<Say voice="alice">Thank you for calling. The assistant has ended '
    "the conversation. Goodbye.</Say><Hangup/>"
)


async def _find_elevenlabs_conversation(call: object) -> str | None:
    """Find the ElevenLabs conversation_id for a completed call.

    Queries the ElevenLabs Conversations API for recent conversations
    and matches by timing.
    """
    import httpx

    api_key = app_settings.ELEVENLABS_API_KEY
    if not api_key:
        return None

    try:
        agent_id = getattr(call, "_resolved_el_agent_id", None)
        url = f"{app_settings.ELEVENLABS_API_BASE_URL}"
        headers = {"xi-api-key": api_key}
        params: dict = {"page_size": 5}
        if agent_id:
            params["agent_id"] = agent_id

        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(url, headers=headers, params=params)
            if resp.status_code != 200:
                logger.warning(
                    "ElevenLabs conversations list returned %d",
                    resp.status_code,
                )
                return None

            data = resp.json()
            conversations = data.get("conversations", [])
            if not conversations:
                return None

            return str(conversations[0].get("conversation_id", "")) or None
    except Exception as e:
        logger.error(
            "Failed to find ElevenLabs conversation: %s",
            str(e)[:200],
        )
        return None


async def _register_elevenlabs_call(
    elevenlabs_agent_id: str,
    from_number: str,
    to_number: str,
    timezone: str = "UTC",
    extra_dynamic_variables: dict[str, str] | None = None,
) -> str | None:
    """Register a call with ElevenLabs Twilio integration and return raw TwiML body.

    Returns the XML body string on success, or None on failure.
    Per-call context (VIP name, memory, etc.) is passed via
    ``extra_dynamic_variables`` which ElevenLabs substitutes into
    ``{{variable_name}}`` placeholders in the synced agent prompt.
    """
    from datetime import datetime as _dt
    from zoneinfo import ZoneInfo

    import httpx

    try:
        tz = ZoneInfo(timezone)
    except Exception:
        tz = ZoneInfo("UTC")

    now = _dt.now(tz)
    today_str = f"{now.strftime('%A')}, {now.strftime('%B')} {now.day}, {now.year}"

    url = "https://api.elevenlabs.io/v1/convai/twilio/register-call"

    headers = {
        "xi-api-key": app_settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }

    dyn_vars = {
        "caller_phone": from_number,
        "today_date": today_str,
        "el_agent_id": elevenlabs_agent_id,
        "user_timezone": timezone,
    }

    if extra_dynamic_variables:
        dyn_vars.update(extra_dynamic_variables)

    payload = {
        "agent_id": elevenlabs_agent_id,
        "from_number": from_number,
        "to_number": to_number,
        "direction": "inbound",
        "conversation_initiation_client_data": {
            "dynamic_variables": dyn_vars,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.post(url, headers=headers, json=payload)
            if resp.status_code == 200:
                logger.info(
                    "ElevenLabs register-call success: agent=%s",
                    elevenlabs_agent_id[:12],
                )
                return resp.text
            else:
                logger.error(
                    "ElevenLabs register-call failed: status=%d body=%s",
                    resp.status_code,
                    resp.text[:300],
                )
    except Exception as e:
        logger.error(
            "ElevenLabs register-call exception: %s",
            str(e)[:200],
        )

    return None


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    if not sig_header:
        return Response(status_code=400, content="Missing Stripe-Signature header")

    result = await billing_service.handle_stripe_webhook(db, payload, sig_header)

    if result.get("status") == "invalid_signature":
        return Response(status_code=400, content="Invalid signature")

    import json

    return Response(
        content=json.dumps({"received": True, "status": result.get("status", "ok")}),
        media_type="application/json",
    )


@router.post("/twilio/voice/inbound")
async def twilio_voice_inbound(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    form = await request.form()
    params = {k: str(v) for k, v in form.items()}

    call_sid = params.get("CallSid", "")
    to_number = params.get("To", "")
    from_number = params.get("From", "")
    forwarded_from = params.get("ForwardedFrom", "")
    parent_call_sid = params.get("ParentCallSid", "")

    if to_number:
        to_hash = hash_phone(to_number)
        allowed, _ = await check_rate_limit(
            f"twilio:voice:inbound:{to_hash}",
            max_requests=app_settings.RATE_LIMIT_WEBHOOK_MAX,
            window_seconds=app_settings.RATE_LIMIT_WEBHOOK_WINDOW,
        )

        if not allowed:
            logger.warning("Rate limit exceeded for inbound webhook to %s", to_hash[:8])
            return _twiml_response(_FALLBACK_TWIML, status_code=200)

    sig_valid = validate_twilio_signature(request, params)
    if not sig_valid:
        logger.warning("Invalid Twilio signature for inbound call sid=%s", call_sid)

        await call_service.record_provider_event(
            db,
            provider="twilio",
            event_type="voice_inbound_signature_failed",
            call_sid=call_sid or None,
            raw_params=params,
            signature_valid=False,
        )

        await db.commit()
        return _twiml_response(_UNAUTHORIZED_TWIML, status_code=403)

    provider_event = await call_service.record_provider_event(
        db,
        provider="twilio",
        event_type="voice_inbound",
        call_sid=call_sid or None,
        raw_params=params,
        signature_valid=True,
    )

    user_number = await call_service.find_user_by_called_number(db, to_number)
    if user_number is None:
        logger.info("No active user number found for To=%s", to_number[:4] + "****")
        await db.commit()
        return _twiml_response(_NOT_IN_SERVICE_TWIML)

    user_id = user_number.owner_user_id
    provider_event.owner_user_id = user_id

    verified = await telephony_service.complete_forwarding_verification(
        db,
        ai_number_e164=to_number,
        forwarded_from=forwarded_from if forwarded_from else None,
        call_sid=call_sid if call_sid else None,
    )

    if verified:
        await db.commit()
        return _twiml_response(_FORWARDING_VERIFIED_TWIML)

    fwd_detected = bool(forwarded_from or parent_call_sid)
    fwd_hint = None
    if forwarded_from:
        fwd_hint = "forwarded_from_present"
    elif parent_call_sid:
        fwd_hint = "parent_call_sid_present"

    source_type = "forwarded" if fwd_detected else "dedicated_number"

    await detect_forwarding_misconfiguration(db, user_id, fwd_detected)

    from app.services import transfer_service

    if from_number and transfer_service.is_loop_call(from_number, to_number):
        logger.warning(
            "Handoff loop detected: from=%s to=%s user=%s",
            from_number[:4] + "****",
            to_number[:4] + "****",
            str(user_id)[:8],
        )
        await db.commit()
        return _twiml_response("<Reject reason='busy'/>")

    settings_row = None
    retention_days = app_settings.DEFAULT_CALL_RETENTION_DAYS
    with contextlib.suppress(Exception):
        settings_row = (
            await db.execute(
                sa_select(UserSettings).where(
                    UserSettings.owner_user_id == user_id,
                )
            )
        ).scalar_one_or_none()

        if settings_row and settings_row.data_retention_days:
            retention_days = settings_row.data_retention_days

    from app.models.contact_profile import ContactProfile

    caller_phone_hash = hash_phone(from_number) if from_number else ""
    contact_profile = None
    _is_vip = False
    is_blocked = False

    if caller_phone_hash:
        contact_profile = (
            await db.execute(
                sa_select(ContactProfile).where(
                    ContactProfile.owner_user_id == user_id,
                    ContactProfile.phone_hash == caller_phone_hash,
                    ContactProfile.deleted_at.is_(None),
                )
            )
        ).scalar_one_or_none()

        if contact_profile:
            _is_vip = contact_profile.is_vip
            is_blocked = contact_profile.is_blocked

    if is_blocked:
        log_attempts = False
        if settings_row:
            log_attempts = getattr(settings_row, "log_blocked_attempts", False)

        if log_attempts:
            call, _ = await call_service.create_or_get_call(
                db,
                user_id=user_id,
                call_sid=call_sid,
                caller_e164=from_number,
                called_e164=to_number,
                source_type=source_type,
                forwarding_detected=fwd_detected,
                forwarding_hint=fwd_hint,
                parent_call_sid=parent_call_sid or None,
                retention_days=retention_days,
            )

            await call_service.transition_call_status(
                db,
                call,
                "completed",
                event_type="call_blocked",
                provider_status="blocked",
            )

        await db.commit()
        logger.info(
            "Blocked caller %s for user %s",
            caller_phone_hash[:8],
            str(user_id)[:8],
        )
        return _twiml_response("<Reject/>")

    agent = await agent_service.get_or_create_default_agent(db, user_id)
    agent_config = agent.config
    resolved_voice_id = agent_config.voice_id if agent_config else None

    call, created = await call_service.create_or_get_call(
        db,
        user_id=user_id,
        call_sid=call_sid,
        caller_e164=from_number,
        called_e164=to_number,
        source_type=source_type,
        forwarding_detected=fwd_detected,
        forwarding_hint=fwd_hint,
        parent_call_sid=parent_call_sid or None,
        retention_days=retention_days,
        agent_id=agent.id,
        voice_id=resolved_voice_id,
    )

    call.id  # noqa: B018 – ensure loaded
    provider_event.call_id = call.id

    if created:
        await call_service.transition_call_status(
            db,
            call,
            "inbound_received",
            event_type="call_started",
            provider_status="ringing",
        )

        await call_service.transition_call_status(
            db,
            call,
            "twiml_responded",
            event_type="twiml_responded",
            provider_status=None,
        )

        await audit_service.log_event(
            db,
            owner_user_id=user_id,
            event_type="CALL_INBOUND_RECEIVED",
            actor_type="system",
            target_type="call",
            target_id=call.id,
            details={"call_sid": call_sid, "source_type": source_type},
        )

        await audit_service.log_event(
            db,
            owner_user_id=user_id,
            event_type="CALL_RECORD_CREATED",
            actor_type="system",
            target_type="call",
            target_id=call.id,
        )

    await db.commit()

    logger.info("Inbound call processed: call_id=%s sid=%s", call.id, call_sid)

    billing_active = await billing_service.is_billing_active(db, user_id)
    if not billing_active:
        logger.info("Billing inactive for user %s, returning fallback", str(user_id)[:8])
        return _twiml_response(_BILLING_INACTIVE_TWIML)

    el_agent_id = agent.elevenlabs_agent_id if agent else None
    if not el_agent_id:
        logger.warning(
            "No ElevenLabs agent ID for user %s \u2014 auto-provisioning", str(user_id)[:8]
        )
        try:
            el_agent_id = await agent_service.ensure_elevenlabs_agent(db, agent, user_id)
        except Exception:
            logger.exception(
                "Auto-provisioning ElevenLabs agent failed for user %s", str(user_id)[:8]
            )

    if not el_agent_id:
        return _twiml_response(_FALLBACK_TWIML)

    user_tz = "UTC"
    if settings_row and settings_row.timezone:
        user_tz = settings_row.timezone

    from app.services.agent_service import (
        _build_repeat_caller_context,
        _load_caller_memory,
        resolve_contact_ai_settings,
    )
    from app.services.prompts import (
        SWEARING_BLOCKS,
        TEMPERAMENT_BLOCKS,
        build_caller_context_block,
        build_contact_instructions_block,
        build_memory_block,
        build_time_limit_block,
    )

    resolved = resolve_contact_ai_settings(contact_profile, settings_row)

    vip_info = None
    if _is_vip and contact_profile:
        vip_info = {
            "display_name": contact_profile.display_name,
            "company": contact_profile.company,
            "relationship": contact_profile.relationship,
            "notes": contact_profile.notes,
        }

    memory_items = None
    repeat_caller_ctx = None
    memory_enabled = settings_row.memory_enabled if settings_row else True
    if caller_phone_hash and memory_enabled:
        memory_items = await _load_caller_memory(db, user_id, caller_phone_hash)
        repeat_caller_ctx = await _build_repeat_caller_context(
            db,
            user_id,
            caller_phone_hash,
            call.id,
            contact_profile=contact_profile,
        )

    caller_ctx = build_caller_context_block(_is_vip, vip_info)
    contact_instr_block = build_contact_instructions_block(resolved.get("custom_instructions"))
    caller_ctx = caller_ctx + contact_instr_block

    memory_ctx = build_memory_block(memory_items, vip_info, repeat_caller_ctx)

    temperament_text = TEMPERAMENT_BLOCKS.get(
        resolved["temperament_preset"],
        TEMPERAMENT_BLOCKS["professional_polite"],
    )

    swearing_text = SWEARING_BLOCKS.get(
        resolved["swearing_rule"],
        SWEARING_BLOCKS["no_swearing"],
    )

    time_limit_text = build_time_limit_block(
        resolved["max_call_length_seconds"],
        resolved["is_vip"],
    )

    extra_dyn = {
        "caller_context": caller_ctx,
        "memory_context": memory_ctx,
        "temperament_block": temperament_text,
        "swearing_block": swearing_text,
        "time_limit_block": time_limit_text,
    }

    use_bridge = app_settings.ENABLE_REALTIME_BRIDGE

    if use_bridge:
        from app.core.session_token import create_stream_session_token

        session_token = create_stream_session_token(call.id, user_id)
        stream_url = app_settings.NODE_BRIDGE_WS_URL

        twiml_body = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            "<Response><Connect>"
            f'<Stream url="{stream_url}">'
            f'<Parameter name="session_token" value="{session_token}" />'
            f'<Parameter name="call_id" value="{call.id}" />'
            f'<Parameter name="user_id" value="{user_id}" />'
            f'<Parameter name="provider_call_sid" value="{call_sid}" />'
            f'<Parameter name="caller_phone" value="{from_number}" />'
            f'<Parameter name="user_timezone" value="{user_tz}" />'
            "</Stream></Connect></Response>"
        )

        from app.services import artifact_service

        await artifact_service.create_ai_session(
            db,
            call_id=call.id,
            user_id=user_id,
            status="connected",
        )

        await db.commit()

        logger.info(
            "Returning Node-bridge Stream TwiML for call_sid=%s agent=%s",
            call_sid[:10],
            el_agent_id[:12],
        )

        return Response(content=twiml_body, media_type="application/xml")

    el_twiml = await _register_elevenlabs_call(
        elevenlabs_agent_id=el_agent_id,
        from_number=from_number,
        to_number=to_number,
        timezone=user_tz,
        extra_dynamic_variables=extra_dyn,
    )

    if el_twiml:
        from app.services import artifact_service

        await artifact_service.create_ai_session(
            db,
            call_id=call.id,
            user_id=user_id,
            status="connected",
        )

        await db.commit()

        logger.info(
            "Returning ElevenLabs TwiML for call_sid=%s agent=%s",
            call_sid[:10],
            el_agent_id[:12],
        )

        return Response(content=el_twiml, media_type="application/xml")

    logger.warning("ElevenLabs register-call failed, returning fallback")
    return _twiml_response(_FALLBACK_TWIML)


@router.post("/twilio/voice/status")
async def twilio_voice_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    form = await request.form()
    params = {k: str(v) for k, v in form.items()}

    call_sid = params.get("CallSid", "")
    call_status = params.get("CallStatus", "")
    call_duration = params.get("CallDuration", "")
    timestamp = params.get("Timestamp", "")

    if call_sid:
        allowed, _ = await check_rate_limit(
            f"twilio:voice:status:{call_sid}",
            max_requests=app_settings.RATE_LIMIT_WEBHOOK_MAX,
            window_seconds=app_settings.RATE_LIMIT_WEBHOOK_WINDOW,
        )

        if not allowed:
            return Response(status_code=429, content="Rate limited")

    sig_valid = validate_twilio_signature(request, params)
    if not sig_valid:
        logger.warning("Invalid Twilio signature for status callback sid=%s", call_sid)
        await call_service.record_provider_event(
            db,
            provider="twilio",
            event_type="voice_status_signature_failed",
            call_sid=call_sid or None,
            raw_params=params,
            signature_valid=False,
        )

        await db.commit()
        return Response(status_code=403, content="Invalid signature")

    provider_event = await call_service.record_provider_event(
        db,
        provider="twilio",
        event_type="voice_status",
        call_sid=call_sid or None,
        raw_params=params,
        signature_valid=True,
    )

    if not call_sid:
        await db.commit()
        return Response(status_code=200, content="ok")

    call = await call_service.get_call_by_sid(db, call_sid)

    if call is None:
        logger.info("Status callback for unknown CallSid=%s, status=%s", call_sid, call_status)
        provider_event.process_status = "received"
        await db.commit()
        return Response(status_code=200, content="ok")

    provider_event.call_id = call.id
    provider_event.owner_user_id = call.owner_user_id

    internal_status = call_service.map_twilio_status(call_status)
    if internal_status is None:
        logger.info("Unknown Twilio status '%s' for sid=%s", call_status, call_sid)
        provider_event.process_status = "processed"
        await db.commit()
        return Response(status_code=200, content="ok")

    ended_at = None
    duration = None
    if internal_status in call_service.TERMINAL_STATES:
        ended_at = datetime.now(UTC)
        if call_duration:
            with contextlib.suppress(ValueError, TypeError):
                duration = int(call_duration)

    event = await call_service.transition_call_status(
        db,
        call,
        internal_status,
        provider_status=call_status,
        event_type="provider_status_update",
        event_details={"twilio_status": call_status, "timestamp": timestamp},
        ended_at=ended_at,
        duration_seconds=duration,
    )

    provider_event.process_status = "processed"

    if event is not None:
        await audit_service.log_event(
            db,
            owner_user_id=call.owner_user_id,
            event_type="CALL_STATUS_UPDATED",
            actor_type="system",
            target_type="call",
            target_id=call.id,
            details={
                "call_sid": call_sid,
                "twilio_status": call_status,
                "internal_status": internal_status,
            },
        )

    if internal_status in call_service.TERMINAL_STATES and (duration or 0) > 0:
        from app.models.call_ai_session import CallAiSession
        from app.services import artifact_service

        ai_session = (
            await db.execute(sa_select(CallAiSession).where(CallAiSession.call_id == call.id))
        ).scalar_one_or_none()

        if ai_session and not ai_session.provider_session_id:
            conv_id = await _find_elevenlabs_conversation(call)
            if conv_id:
                ai_session.provider_session_id = conv_id
                ai_session.status = "completed"
                ai_session.ended_at = datetime.now(UTC)
                if duration:
                    ai_session.duration_seconds = duration
                logger.info(
                    "Linked ElevenLabs conversation %s to call %s",
                    conv_id[:12],
                    str(call.id)[:8],
                )

        conversation_id = ai_session.provider_session_id if ai_session else None
        if conversation_id:
            await artifact_service.trigger_post_call_processing(
                db,
                call_id=call.id,
                user_id=call.owner_user_id,
                conversation_id=conversation_id,
            )

            logger.info("Post-call processing triggered for call %s", str(call.id)[:8])

    await db.commit()
    return Response(status_code=200, content="ok")


@router.post("/elevenlabs/conversation")
async def elevenlabs_conversation_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    body = await request.body()

    allowed, _ = await check_rate_limit(
        "elevenlabs:conversation:webhook",
        max_requests=app_settings.RATE_LIMIT_WEBHOOK_MAX,
        window_seconds=app_settings.RATE_LIMIT_WEBHOOK_WINDOW,
    )

    if not allowed:
        return Response(status_code=429, content="Rate limited")

    signature = request.headers.get("X-ElevenLabs-Signature", "")
    if not verify_elevenlabs_hmac(body, signature):
        logger.warning("Invalid ElevenLabs webhook signature")
        return Response(status_code=403, content="Invalid signature")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return Response(status_code=400, content="Invalid JSON")

    conversation_id = payload.get("conversation_id", "")
    event_type = payload.get("event_type", "conversation_ended")

    redacted_payload = {
        "conversation_id": conversation_id,
        "event_type": event_type,
        "status": payload.get("status", ""),
    }

    pe = await call_service.record_provider_event(
        db,
        provider="elevenlabs",
        event_type=f"conversation_{event_type}",
        call_sid=conversation_id or None,
        raw_params=redacted_payload,
        signature_valid=True,
    )

    from app.services import artifact_service

    session = await artifact_service.find_ai_session_by_provider_id(
        db,
        conversation_id,
    )

    if session is None:
        from app.models.call_ai_session import CallAiSession

        fallback_stmt = (
            sa_select(CallAiSession)
            .where(
                CallAiSession.provider_session_id.is_(None),
                CallAiSession.status == "connected",
            )
            .order_by(CallAiSession.started_at.desc())
            .limit(1)
        )

        session = (await db.execute(fallback_stmt)).scalar_one_or_none()
        if session:
            session.provider_session_id = conversation_id
            logger.info(
                "Linked ElevenLabs conversation %s to call %s via fallback",
                conversation_id[:12],
                str(session.call_id)[:8],
            )

    if session:
        pe.call_id = session.call_id
        pe.owner_user_id = session.owner_user_id

        await artifact_service.trigger_post_call_processing(
            db,
            call_id=session.call_id,
            user_id=session.owner_user_id,
            conversation_id=conversation_id,
        )
    else:
        logger.warning(
            "No AI session found for ElevenLabs conversation %s",
            conversation_id[:12],
        )

    pe.process_status = "processed"
    pe.processed_at = datetime.now(UTC)
    await db.commit()

    return Response(
        content=json.dumps({"received": True}),
        media_type="application/json",
    )


_SMS_STATUS_MAP = {
    "queued": "queued",
    "accepted": "accepted",
    "sending": "sending",
    "sent": "sent",
    "delivered": "delivered",
    "undelivered": "undelivered",
    "failed": "failed",
}

_SMS_TERMINAL_SUCCESS = {"sent", "delivered"}
_SMS_TERMINAL_FAILURE = {"undelivered", "failed"}


@router.post("/twilio/sms/status")
async def twilio_sms_status(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    form = await request.form()
    params = {k: str(v) for k, v in form.items()}

    message_sid = params.get("MessageSid", "")
    message_status = params.get("MessageStatus", "")
    error_code = params.get("ErrorCode", "")

    if message_sid:
        allowed, _ = await check_rate_limit(
            f"twilio:sms:status:{message_sid}",
            max_requests=app_settings.RATE_LIMIT_WEBHOOK_MAX,
            window_seconds=app_settings.RATE_LIMIT_WEBHOOK_WINDOW,
        )

        if not allowed:
            return Response(status_code=429, content="Rate limited")

    sig_valid = validate_twilio_signature(request, params)
    if not sig_valid:
        logger.warning("Invalid Twilio signature for SMS status sid=%s", message_sid)
        return Response(status_code=403, content="Invalid signature")

    if not message_sid:
        return Response(status_code=200, content="ok")

    from sqlalchemy import select

    from app.models.outbound_message import OutboundMessage
    from app.models.text_send_attempt import TextSendAttempt

    stmt = select(TextSendAttempt).where(
        TextSendAttempt.provider_message_sid == message_sid,
    )

    result = await db.execute(stmt)
    attempt = result.scalar_one_or_none()

    if attempt is None:
        logger.info("SMS status callback for unknown MessageSid=%s", message_sid)
        return Response(status_code=200, content="ok")

    normalized = _SMS_STATUS_MAP.get(message_status, "unknown")
    attempt.provider_status = normalized
    if error_code:
        attempt.provider_error_code = error_code
        attempt.provider_error_message_short = params.get("ErrorMessage", "")[:200]

    if normalized in _SMS_TERMINAL_SUCCESS or normalized in _SMS_TERMINAL_FAILURE:
        attempt.finished_at = datetime.now(UTC)

    msg = await db.get(OutboundMessage, attempt.message_id)
    if msg is not None:
        if normalized == "delivered":
            msg.status = "delivered"
        elif normalized in _SMS_TERMINAL_FAILURE:
            msg.status = "failed"
            msg.last_error_code = error_code or "PROVIDER_FAILURE"
            msg.last_error_message_short = params.get("ErrorMessage", "SMS delivery failed")[:200]

    await db.commit()
    return Response(status_code=200, content="ok")


@router.post("/elevenlabs/tool")
async def elevenlabs_tool_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    """Handle tool invocations from ElevenLabs agents (e.g. book_appointment)."""
    body = await request.body()

    allowed, _ = await check_rate_limit(
        "elevenlabs:tool:webhook",
        max_requests=app_settings.RATE_LIMIT_WEBHOOK_MAX,
        window_seconds=app_settings.RATE_LIMIT_WEBHOOK_WINDOW,
    )

    if not allowed:
        return Response(status_code=429, content="Rate limited")

    tool_secret = request.headers.get("X-Tool-Secret", "")
    expected = app_settings.ELEVENLABS_TOOL_WEBHOOK_SECRET
    if expected and tool_secret != expected:
        logger.warning("Invalid tool webhook secret")
        return Response(status_code=403, content="Invalid secret")

    try:
        payload = json.loads(body)
    except json.JSONDecodeError:
        return Response(status_code=400, content="Invalid JSON")

    logger.info("Tool webhook payload keys: %s", list(payload.keys()))

    if "parameters" in payload and isinstance(payload["parameters"], dict):
        tool_name = payload.get("tool_name", "")
        agent_id_str = payload.get("agent_id", "")
        parameters = payload["parameters"]
    else:
        tool_name = payload.get("tool_name", "")
        agent_id_str = payload.get("agent_id", "")
        parameters = payload

    logger.info(
        "Tool webhook: tool_name=%s agent_id=%s params=%s",
        tool_name,
        agent_id_str[:20] if agent_id_str else "<empty>",
        json.dumps(parameters)[:300],
    )

    if tool_name not in ("book_appointment", "get_available_slots"):
        return Response(
            content=json.dumps({"success": False, "error": f"Unknown tool: {tool_name}"}),
            media_type="application/json",
        )

    from app.models.agent import Agent
    from app.models.user_settings import UserSettings
    from app.services import calendar_service

    if not agent_id_str:
        logger.warning("Tool webhook: agent_id missing from payload")
        return Response(
            content=json.dumps({"success": False, "error": "Missing agent_id"}),
            media_type="application/json",
        )

    agent_row = (
        await db.execute(sa_select(Agent).where(Agent.elevenlabs_agent_id == agent_id_str))
    ).scalar_one_or_none()

    if agent_row is None:
        logger.warning("Tool webhook: no agent for elevenlabs_agent_id=%s", agent_id_str[:20])
        return Response(
            content=json.dumps({"success": False, "error": "Agent not found"}),
            media_type="application/json",
        )

    user_id = agent_row.owner_user_id
    settings_row = await db.get(UserSettings, user_id)

    if not settings_row or not settings_row.calendar_booking_enabled:
        return Response(
            content=json.dumps({"success": False, "error": "Calendar booking is not enabled"}),
            media_type="application/json",
        )

    if tool_name == "get_available_slots":
        date_str = parameters.get("date", "")
        if not date_str:
            return Response(
                content=json.dumps({"success": False, "error": "Missing date parameter"}),
                media_type="application/json",
            )

        duration = int(
            parameters.get("duration_minutes", settings_row.calendar_default_duration_minutes)
        )

        timezone = settings_row.timezone or "UTC"
        booking_window = settings_row.calendar_booking_window_days or 14

        try:
            from datetime import date as dt_date

            requested = dt_date.fromisoformat(date_str)
            today = dt_date.today()
            if requested < today:
                return Response(
                    content=json.dumps(
                        {"success": False, "error": "Cannot check availability for past dates"}
                    ),
                    media_type="application/json",
                )

            if (requested - today).days > booking_window:
                from datetime import timedelta as _td

                cutoff = (today + _td(days=booking_window)).isoformat()
                return Response(
                    content=json.dumps(
                        {
                            "success": False,
                            "error": (
                                f"Date is outside the {booking_window}-day booking window. "
                                f"Please choose a date before {cutoff}."
                            ),
                        }
                    ),
                    media_type="application/json",
                )
        except ValueError:
            return Response(
                content=json.dumps(
                    {"success": False, "error": "Invalid date format, use YYYY-MM-DD"}
                ),
                media_type="application/json",
            )

        all_slots = await calendar_service.find_available_slots(
            db,
            user_id=user_id,
            date_str=date_str,
            duration_minutes=duration,
            timezone=timezone,
        )

        if not all_slots:
            return Response(
                content=json.dumps(
                    {
                        "success": True,
                        "available": False,
                        "message": (
                            f"No available {duration}-minute"
                            f" slots on {date_str}. Please ask"
                            " the caller for an alternative"
                            " date."
                        ),
                        "slots": [],
                    }
                ),
                media_type="application/json",
            )

        from datetime import datetime as _dt
        from zoneinfo import ZoneInfo

        user_tz = ZoneInfo(timezone)
        formatted = []
        for s in all_slots:
            start = _dt.fromisoformat(s["start"]).astimezone(user_tz)
            end = _dt.fromisoformat(s["end"]).astimezone(user_tz)

            def _time_label(dt: _dt) -> str:
                h = dt.hour % 12 or 12
                return f"{h}:{dt.strftime('%M %p')}"

            formatted.append(
                {
                    "start": s["start"],
                    "end": s["end"],
                    "label": f"{_time_label(start)} to {_time_label(end)}",
                }
            )

        return Response(
            content=json.dumps(
                {
                    "success": True,
                    "available": True,
                    "date": date_str,
                    "duration_minutes": duration,
                    "slots": formatted,
                    "timezone": timezone,
                    "total_slots": len(formatted),
                    "message": (
                        f"{len(formatted)} available slots on {date_str} ({timezone}). "
                        f"All times are in {timezone}. Present only up to 3 slots at a time "
                        "to the caller. Pick a good spread (morning, midday, afternoon). "
                        "If the caller wants more options, offer the next batch."
                    ),
                }
            ),
            media_type="application/json",
        )

    # book_appointment
    date_str = parameters.get("date", "")
    time_str = parameters.get("time", "")
    duration = parameters.get("duration_minutes", settings_row.calendar_default_duration_minutes)
    caller_name = parameters.get("caller_name", "Caller")
    reason = parameters.get("reason", "Appointment")
    caller_phone = parameters.get("caller_phone", "")

    if not date_str or not time_str:
        return Response(
            content=json.dumps({"success": False, "error": "Missing date or time"}),
            media_type="application/json",
        )

    timezone = settings_row.timezone or "UTC"

    try:
        from zoneinfo import ZoneInfo

        tz = ZoneInfo(timezone)
        from datetime import datetime as dt_cls
        from datetime import timedelta

        start_naive = dt_cls.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M")
        start_dt = start_naive.replace(tzinfo=tz)
        end_dt = start_dt + timedelta(minutes=int(duration))

        start_iso = start_dt.isoformat()
        end_iso = end_dt.isoformat()
    except (ValueError, KeyError) as exc:
        return Response(
            content=json.dumps({"success": False, "error": f"Invalid date/time: {exc}"}),
            media_type="application/json",
        )

    from app.models.call import Call
    from app.models.user import User

    user = await db.get(User, user_id)

    user_display = (user.display_name or user.nickname or "Meeting") if user else "Meeting"

    summary = f"{reason} with {caller_name} - {user_display}"

    recent_call = (
        await db.execute(
            sa_select(Call)
            .where(Call.owner_user_id == user_id)
            .where(Call.status.in_(["in_progress", "inbound_received", "twiml_responded"]))
            .order_by(Call.started_at.desc())
            .limit(1)
        )
    ).scalar_one_or_none()

    phone_display = caller_phone
    call_id_str = None
    if recent_call:
        call_id_str = str(recent_call.id)
        if not phone_display:
            phone_display = recent_call.from_masked

    desc_lines = [f"Caller: {caller_name}"]

    if phone_display:
        desc_lines.append(f"Phone: {phone_display}")
    desc_lines.append(f"Reason: {reason}")
    desc_lines.append(f"Duration: {duration} minutes")
    desc_lines.append("")
    desc_lines.append("Booked by AI assistant during call.")
    if call_id_str:
        desc_lines.append("")
        desc_lines.append(f"View call details in MattBot: mattbot://call-detail/{call_id_str}")

    description = "\n".join(desc_lines)

    result = await calendar_service.create_event(
        db,
        user_id=user_id,
        summary=summary,
        start_datetime=start_iso,
        end_datetime=end_iso,
        description=description,
        timezone=timezone,
        call_id=call_id_str,
    )

    if result is None:
        return Response(
            content=json.dumps({"success": False, "error": "Failed to create calendar event"}),
            media_type="application/json",
        )

    if recent_call:
        recent_call.booked_calendar_event_id = result.get("id", "")
        recent_call.booked_calendar_event_summary = summary

    await audit_service.log_event(
        db,
        owner_user_id=user_id,
        event_type="calendar.appointment_booked",
        actor_type="system",
        details={
            "caller_name": caller_name,
            "caller_phone": phone_display,
            "reason": reason,
            "date": date_str,
            "time": time_str,
            "duration_minutes": duration,
            "event_id": result.get("id", ""),
            "call_id": call_id_str,
        },
    )

    await db.commit()

    return Response(
        content=json.dumps(
            {
                "success": True,
                "event": {
                    "date": date_str,
                    "time": time_str,
                    "duration_minutes": duration,
                    "summary": summary,
                },
            }
        ),
        media_type="application/json",
    )

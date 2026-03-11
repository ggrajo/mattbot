import json
import logging

from fastapi import APIRouter, Depends, Request
from fastapi.responses import JSONResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.core.twilio_utils import get_twiml_response, validate_twilio_request
from app.database import get_db
from app.middleware.error_handler import AppError
from app.models.provider_event import ProviderEvent
from app.models.user_number import UserNumber
from app.services import billing_service, call_service

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/stripe")
async def stripe_webhook(request: Request) -> JSONResponse:
    raw_body = await request.body()
    signature = request.headers.get("stripe-signature")

    if not signature:
        raise AppError("WEBHOOK_ERROR", "Missing Stripe signature header", 400)

    try:
        await billing_service.handle_stripe_webhook(raw_body, signature)
    except AppError:
        raise
    except Exception as e:
        logger.exception("Stripe webhook processing failed")
        raise AppError("WEBHOOK_ERROR", f"Webhook processing failed: {e}", 500)

    return JSONResponse(content={"status": "ok"}, status_code=200)


@router.post("/twilio/voice")
async def twilio_voice_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    form_data = await request.form()
    body = dict(form_data)

    if settings.TWILIO_AUTH_TOKEN and not validate_twilio_request(request, body):
        raise AppError("WEBHOOK_ERROR", "Invalid Twilio signature", 403)

    provider_event = ProviderEvent(
        provider="twilio",
        provider_event_id=body.get("CallSid"),
        event_type="voice_incoming",
        payload_redacted=json.dumps(
            {k: v for k, v in body.items() if k not in ("AccountSid",)}
        ),
    )
    db.add(provider_event)

    to_number = body.get("To", "")
    from_number = body.get("From", "")
    call_sid = body.get("CallSid")

    result = await db.execute(
        select(UserNumber).where(
            UserNumber.e164 == to_number,
            UserNumber.status.in_(("active", "provisioned")),
        )
    )
    user_number = result.scalars().first()

    if user_number is None:
        logger.warning("Inbound call to unrecognised number %s", to_number)
        twiml = get_twiml_response("Sorry, this number is not configured. Goodbye.")
        return Response(content=twiml, media_type="application/xml")

    await call_service.create_call(
        db,
        user_id=user_number.owner_user_id,
        from_number=from_number,
        to_number=to_number,
        twilio_call_sid=call_sid,
        direction="inbound",
    )

    twiml = get_twiml_response(
        "Hello, thanks for calling. The AI assistant is not yet configured. Please try again later. Goodbye."
    )
    return Response(content=twiml, media_type="application/xml")


@router.post("/elevenlabs")
async def elevenlabs_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> JSONResponse:
    try:
        raw_body = await request.body()
        payload = json.loads(raw_body)
    except (json.JSONDecodeError, Exception):
        raise AppError("WEBHOOK_ERROR", "Invalid ElevenLabs payload", 400)

    provider_event = ProviderEvent(
        provider="elevenlabs",
        provider_event_id=payload.get("conversation_id"),
        event_type=f"elevenlabs_{payload.get('event_type', 'unknown')}",
        payload_redacted=json.dumps(
            {k: v for k, v in payload.items() if k not in ("api_key",)}
        ),
    )
    db.add(provider_event)

    conversation_id = payload.get("conversation_id")
    event_type = payload.get("event_type", "")

    if event_type == "conversation_ended" and conversation_id:
        call_sid = payload.get("metadata", {}).get("twilio_call_sid")
        if call_sid:
            try:
                duration = payload.get("duration_seconds")
                await call_service.handle_twilio_status_callback(
                    db, call_sid, "completed", duration
                )
            except AppError:
                logger.warning(
                    "ElevenLabs callback for unknown call SID %s", call_sid
                )
            except Exception:
                logger.exception("Failed to process ElevenLabs callback")

    return JSONResponse(content={"status": "ok"}, status_code=200)


@router.post("/twilio/voice/status")
async def twilio_voice_status_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Response:
    form_data = await request.form()
    body = dict(form_data)

    if settings.TWILIO_AUTH_TOKEN and not validate_twilio_request(request, body):
        raise AppError("WEBHOOK_ERROR", "Invalid Twilio signature", 403)

    provider_event = ProviderEvent(
        provider="twilio",
        provider_event_id=None,
        event_type=f"voice_status_{body.get('CallStatus', 'unknown')}",
        payload_redacted=json.dumps(
            {k: v for k, v in body.items() if k not in ("AccountSid",)}
        ),
    )
    db.add(provider_event)

    call_sid = body.get("CallSid")
    twilio_status = body.get("CallStatus", "")
    duration_str = body.get("CallDuration")
    duration = int(duration_str) if duration_str else None

    if call_sid:
        try:
            await call_service.handle_twilio_status_callback(
                db, call_sid, twilio_status, duration
            )
        except AppError:
            logger.warning("Status callback for unknown call SID %s", call_sid)
        except Exception:
            logger.exception("Failed to process Twilio status callback")

    return Response(
        content='<?xml version="1.0" encoding="UTF-8"?><Response/>',
        media_type="application/xml",
    )

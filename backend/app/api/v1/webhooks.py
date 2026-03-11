import logging

from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse

from app.middleware.error_handler import AppError
from app.services import billing_service

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

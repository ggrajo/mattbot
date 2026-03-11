from fastapi import Request
from twilio.request_validator import RequestValidator

from app.config import settings


def validate_twilio_request(request: Request, body: dict) -> bool:
    if not settings.TWILIO_AUTH_TOKEN:
        return settings.ENVIRONMENT == "development"
    validator = RequestValidator(settings.TWILIO_AUTH_TOKEN)
    url = str(request.url)
    signature = request.headers.get("X-Twilio-Signature", "")
    return validator.validate(url, body, signature)


def get_twiml_response(message: str = "Hello, this is MattBot.") -> str:
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response><Say>{message}</Say></Response>"
    )


def get_gather_twiml(prompt: str, action_url: str, num_digits: int = 6) -> str:
    return (
        f'<?xml version="1.0" encoding="UTF-8"?>'
        f"<Response>"
        f'<Gather numDigits="{num_digits}" action="{action_url}" method="POST">'
        f"<Say>{prompt}</Say></Gather>"
        f"<Say>We did not receive any input. Goodbye.</Say></Response>"
    )

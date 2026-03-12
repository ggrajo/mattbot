"""
Test script: Place a call to cycloaaa's AI phone number via Twilio.

This initiates an outbound call from Twilio to YOUR personal phone.
When you answer, Twilio connects you to cycloaaa's AI number (***PHONE_REDACTED***),
which triggers the backend webhook -> realtime bridge -> ElevenLabs agent flow.

Usage:
    python test_call.py --to +639XXXXXXXXX

Replace +639XXXXXXXXX with the personal phone number you want Twilio to call.
"""

import argparse
import sys

from twilio.rest import Client

TWILIO_ACCOUNT_SID = "***TWILIO_SID_REDACTED***"
TWILIO_AUTH_TOKEN = "***TWILIO_TOKEN_REDACTED***"

CYCLOAAA_AI_NUMBER = "***PHONE_REDACTED***"

BACKEND_BASE_URL = "http://3.238.82.209"
WEBHOOK_URL = f"{BACKEND_BASE_URL}/api/v1/webhooks/twilio/voice/inbound"
STATUS_CALLBACK_URL = f"{BACKEND_BASE_URL}/api/v1/webhooks/twilio/voice/status"


def main():
    parser = argparse.ArgumentParser(description="Test call to cycloaaa AI number")
    parser.add_argument(
        "--to",
        required=True,
        help="Your personal phone number in E.164 format (e.g. +639171234567)",
    )
    parser.add_argument(
        "--twiml",
        action="store_true",
        help="Use TwiML <Dial> instead of direct URL webhook (simpler, no webhook validation issues)",
    )
    args = parser.parse_args()

    your_phone = args.to
    if not your_phone.startswith("+"):
        print("ERROR: Phone number must be in E.164 format (starting with +)")
        sys.exit(1)

    client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)

    print(f"Placing call...")
    print(f"  From (AI number) : {CYCLOAAA_AI_NUMBER}")
    print(f"  To (your phone)  : {your_phone}")
    print()

    if args.twiml:
        twiml_str = (
            f'<Response>'
            f'<Say>Connecting you to the AI assistant. Please wait.</Say>'
            f'<Dial>{CYCLOAAA_AI_NUMBER}</Dial>'
            f'</Response>'
        )
        call = client.calls.create(
            to=your_phone,
            from_=CYCLOAAA_AI_NUMBER,
            twiml=twiml_str,
            status_callback=STATUS_CALLBACK_URL,
            status_callback_event=["initiated", "ringing", "answered", "completed"],
        )
    else:
        call = client.calls.create(
            to=your_phone,
            from_=CYCLOAAA_AI_NUMBER,
            url=WEBHOOK_URL,
            status_callback=STATUS_CALLBACK_URL,
            status_callback_event=["initiated", "ringing", "answered", "completed"],
        )

    print(f"Call initiated successfully!")
    print(f"  Call SID: {call.sid}")
    print(f"  Status  : {call.status}")
    print()
    print("What to expect:")
    print("  1. Your phone will ring")
    print("  2. Answer the call")
    print("  3. You'll be connected to the AI agent (Matt)")
    print("  4. Speak to test the AI screening flow")
    print()
    print("Monitor the backend/worker/realtime logs on the server:")
    print("  ssh mattbot 'docker logs -f mattbot-backend'")
    print("  ssh mattbot 'docker logs -f mattbot-realtime'")
    print("  ssh mattbot 'docker logs -f mattbot-worker'")


if __name__ == "__main__":
    main()

"""
Test script: Place a call to cycloaaa's AI phone number via Twilio REST API.

No external dependencies needed - uses only Python stdlib.

Usage:
    python test_call_simple.py --to +639XXXXXXXXX

Replace +639XXXXXXXXX with the personal phone number you want Twilio to call.
When you answer, the backend webhook fires and connects you to the AI agent.
"""

import argparse
import base64
import json
import os
import sys
import urllib.request
import urllib.parse
import urllib.error

TWILIO_ACCOUNT_SID = os.environ.get("TWILIO_ACCOUNT_SID", "")
TWILIO_AUTH_TOKEN = os.environ.get("TWILIO_AUTH_TOKEN", "")

CYCLOAAA_AI_NUMBER = os.environ.get("TEST_AI_NUMBER", "")
RAGRAJO_NUMBER = os.environ.get("TEST_FROM_NUMBER", "")

BACKEND_BASE_URL = os.environ.get("BACKEND_BASE_URL", "http://localhost:8000")
WEBHOOK_URL = f"{BACKEND_BASE_URL}/webhooks/twilio/voice/inbound"
STATUS_CALLBACK_URL = f"{BACKEND_BASE_URL}/webhooks/twilio/voice/status"


def main():
    parser = argparse.ArgumentParser(description="Test call to cycloaaa AI number")
    parser.add_argument(
        "--to",
        default=CYCLOAAA_AI_NUMBER,
        help="AI number to call (default: TEST_AI_NUMBER env var)",
    )
    parser.add_argument(
        "--from-number",
        default=RAGRAJO_NUMBER,
        help="Caller ID (default: TEST_FROM_NUMBER env var)",
    )
    args = parser.parse_args()

    to_number = args.to
    from_number = args.from_number

    if not TWILIO_ACCOUNT_SID or not TWILIO_AUTH_TOKEN:
        print("ERROR: Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables")
        sys.exit(1)
    if not to_number:
        print("ERROR: Provide --to or set TEST_AI_NUMBER environment variable")
        sys.exit(1)
    if not from_number:
        print("ERROR: Provide --from-number or set TEST_FROM_NUMBER environment variable")
        sys.exit(1)

    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/Calls.json"

    data = urllib.parse.urlencode({
        "To": to_number,
        "From": from_number,
        "Twiml": "<Response><Pause length=\"60\"/></Response>",
        "StatusCallback": STATUS_CALLBACK_URL,
        "StatusCallbackEvent": "initiated ringing answered completed",
    }).encode("utf-8")

    credentials = base64.b64encode(
        f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()
    ).decode()

    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    print(f"Placing call...")
    print(f"  From (caller)    : {from_number}")
    print(f"  To (AI number)   : {to_number}")
    print(f"  Webhook URL      : {WEBHOOK_URL}")
    print()

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode())
            print("Call initiated successfully!")
            print(f"  Call SID: {result.get('sid')}")
            print(f"  Status  : {result.get('status')}")
            print()
            print("What to expect:")
            print("  1. Your phone will ring")
            print("  2. Answer the call")
            print("  3. The backend webhook fires -> creates call record -> connects to AI")
            print("  4. Speak to the AI agent (Matt) to test the full flow")
            print()
            print("Monitor logs on the server with:")
            print("  ssh mattbot \"docker logs -f mattbot-backend\"")
            print("  ssh mattbot \"docker logs -f mattbot-realtime\"")
            print("  ssh mattbot \"docker logs -f mattbot-worker\"")

    except urllib.error.HTTPError as e:
        body = e.read().decode()
        print(f"ERROR: Twilio API returned {e.code}")
        print(f"Response: {body}")
        sys.exit(1)


if __name__ == "__main__":
    main()

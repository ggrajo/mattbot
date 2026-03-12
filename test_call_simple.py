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
import sys
import urllib.request
import urllib.parse
import urllib.error

TWILIO_ACCOUNT_SID = "***TWILIO_SID_REDACTED***"
TWILIO_AUTH_TOKEN = "***TWILIO_TOKEN_REDACTED***"

CYCLOAAA_AI_NUMBER = "***PHONE_REDACTED***"
RAGRAJO_NUMBER = "***PHONE_REDACTED***"

BACKEND_BASE_URL = "http://3.238.82.209"
WEBHOOK_URL = f"{BACKEND_BASE_URL}/webhooks/twilio/voice/inbound"
STATUS_CALLBACK_URL = f"{BACKEND_BASE_URL}/webhooks/twilio/voice/status"


def main():
    parser = argparse.ArgumentParser(description="Test call to cycloaaa AI number")
    parser.add_argument(
        "--to",
        default=CYCLOAAA_AI_NUMBER,
        help="AI number to call (default: cycloaaa's ***PHONE_REDACTED***)",
    )
    parser.add_argument(
        "--from-number",
        default=RAGRAJO_NUMBER,
        help="Caller ID (default: ragrajo04's ***PHONE_REDACTED***)",
    )
    args = parser.parse_args()

    to_number = args.to
    from_number = args.from_number

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

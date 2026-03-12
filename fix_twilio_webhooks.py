"""Update Twilio webhook URLs to point to production server."""
import base64
import json
import urllib.request
import urllib.parse

TWILIO_ACCOUNT_SID = "***TWILIO_SID_REDACTED***"
TWILIO_AUTH_TOKEN = "***TWILIO_TOKEN_REDACTED***"

BACKEND_BASE_URL = "http://3.238.82.209"
VOICE_URL = f"{BACKEND_BASE_URL}/webhooks/twilio/voice/inbound"
STATUS_URL = f"{BACKEND_BASE_URL}/webhooks/twilio/voice/status"

credentials = base64.b64encode(
    f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()
).decode()

numbers_to_update = {
    "PN2e59e212bbf38b8c21c199c6cba3870c": "***PHONE_REDACTED*** (cycloaaa)",
    "PN633a48cbb9e39292e2d380357222e66c": "***PHONE_REDACTED*** (ragrajo04)",
}

for sid, label in numbers_to_update.items():
    url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/{sid}.json"

    data = urllib.parse.urlencode({
        "VoiceUrl": VOICE_URL,
        "VoiceMethod": "POST",
        "StatusCallback": STATUS_URL,
        "StatusCallbackMethod": "POST",
    }).encode("utf-8")

    req = urllib.request.Request(
        url,
        data=data,
        method="POST",
        headers={
            "Authorization": f"Basic {credentials}",
            "Content-Type": "application/x-www-form-urlencoded",
        },
    )

    with urllib.request.urlopen(req) as response:
        result = json.loads(response.read().decode())
        print(f"Updated {label}:")
        print(f"  Voice URL: {result.get('voice_url')}")
        print(f"  Status Callback: {result.get('status_callback')}")
        print()

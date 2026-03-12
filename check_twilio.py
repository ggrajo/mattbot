"""Check Twilio number webhook configuration."""
import json
import base64
import urllib.request

TWILIO_ACCOUNT_SID = "***TWILIO_SID_REDACTED***"
TWILIO_AUTH_TOKEN = "***TWILIO_TOKEN_REDACTED***"

credentials = base64.b64encode(
    f"{TWILIO_ACCOUNT_SID}:{TWILIO_AUTH_TOKEN}".encode()
).decode()

url = f"https://api.twilio.com/2010-04-01/Accounts/{TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json"

req = urllib.request.Request(
    url,
    headers={"Authorization": f"Basic {credentials}"},
)

with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    for num in data.get("incoming_phone_numbers", []):
        print(f"Number: {num['phone_number']}")
        print(f"  Voice URL: {num.get('voice_url')}")
        print(f"  Voice Method: {num.get('voice_method')}")
        print(f"  Status Callback: {num.get('status_callback')}")
        print(f"  SID: {num['sid']}")
        print()

"""Check ElevenLabs conversation details."""
import json
import urllib.request

ELEVENLABS_API_KEY = None
CONV_ID = "conv_3601kkfn352dfrea131w3qxtjq99"

import os
# Try to read from env file
with open("/home/ubuntu/mattbot/backend/.env") as f:
    for line in f:
        line = line.strip()
        if line.startswith("ELEVENLABS_API_KEY=") and not line.startswith("#"):
            ELEVENLABS_API_KEY = line.split("=", 1)[1]
            break

if not ELEVENLABS_API_KEY:
    print("ERROR: ELEVENLABS_API_KEY not found in backend/.env")
    exit(1)

# List recent conversations
url = f"https://api.elevenlabs.io/v1/convai/conversations?page_size=5"
req = urllib.request.Request(
    url,
    headers={"xi-api-key": ELEVENLABS_API_KEY},
)

print("=== Recent Conversations ===")
with urllib.request.urlopen(req) as response:
    data = json.loads(response.read().decode())
    for conv in data.get("conversations", []):
        print(f"  ID: {conv.get('conversation_id')}")
        print(f"  Status: {conv.get('status')}")
        print(f"  Agent: {conv.get('agent_id')}")
        print(f"  Duration: {conv.get('call_duration_secs')}s")
        print()

# Get specific conversation transcript
print(f"=== Conversation {CONV_ID} Details ===")
url2 = f"https://api.elevenlabs.io/v1/convai/conversations/{CONV_ID}"
req2 = urllib.request.Request(
    url2,
    headers={"xi-api-key": ELEVENLABS_API_KEY},
)

try:
    with urllib.request.urlopen(req2) as response:
        data = json.loads(response.read().decode())
        print(f"Status: {data.get('status')}")
        print(f"Duration: {data.get('call_duration_secs')}s")
        transcript = data.get("transcript", [])
        if transcript:
            print(f"\nTranscript ({len(transcript)} messages):")
            for msg in transcript:
                role = msg.get("role", "?")
                text = msg.get("message", "")
                print(f"  [{role}]: {text}")
        else:
            print("No transcript available.")
except urllib.error.HTTPError as e:
    print(f"Error: {e.code} - {e.read().decode()}")

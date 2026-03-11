"""Service for interacting with the ElevenLabs Conversational AI API."""

import logging
import uuid

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1"


class ElevenLabsAgentService:

    @staticmethod
    async def create_conversation(
        agent_id: str,
        system_prompt: str,
        voice_id: str | None = None,
    ) -> dict:
        """Start a new ElevenLabs conversation.

        In development mode (no API key configured), returns a mock response
        so local testing works without ElevenLabs credentials.
        """
        api_key = getattr(settings, "ELEVENLABS_API_KEY", "")
        if not api_key:
            mock_id = f"mock_conv_{uuid.uuid4().hex[:12]}"
            logger.info("ElevenLabs API key not set; returning mock conversation %s", mock_id)
            return {
                "conversation_id": mock_id,
                "status": "active",
                "mock": True,
            }

        headers = {"xi-api-key": api_key, "Content-Type": "application/json"}
        payload: dict = {
            "agent_id": agent_id,
            "system_prompt": system_prompt,
        }
        if voice_id:
            payload["voice_id"] = voice_id

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{ELEVENLABS_API_BASE}/convai/conversations",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            return resp.json()

    @staticmethod
    async def end_conversation(conversation_id: str) -> dict:
        """End an active ElevenLabs conversation."""
        api_key = getattr(settings, "ELEVENLABS_API_KEY", "")
        if not api_key:
            logger.info("ElevenLabs API key not set; mock-ending conversation %s", conversation_id)
            return {"conversation_id": conversation_id, "status": "ended", "mock": True}

        headers = {"xi-api-key": api_key, "Content-Type": "application/json"}

        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{ELEVENLABS_API_BASE}/convai/conversations/{conversation_id}/end",
                headers=headers,
            )
            resp.raise_for_status()
            return resp.json()

import WebSocket from "ws";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const EL_WS_URL = "wss://api.elevenlabs.io/v1/convai/conversation";

export interface ElevenLabsSession {
  ws: WebSocket;
  conversationId: string | null;
  onAudio: (pcm16kBase64: string) => void;
  onEnd: (conversationId: string) => void;
  onError: (error: Error) => void;
}

/**
 * Create a WebSocket session to ElevenLabs Conversational AI.
 */
export function createElevenLabsSession(callbacks: {
  onAudio: (audioBase64: string) => void;
  onEnd: (conversationId: string) => void;
  onError: (error: Error) => void;
}): ElevenLabsSession {
  const url = `${EL_WS_URL}?agent_id=${config.elevenlabsAgentId}`;

  const ws = new WebSocket(url, {
    headers: {
      "xi-api-key": config.elevenlabsApiKey,
    },
  });

  const session: ElevenLabsSession = {
    ws,
    conversationId: null,
    onAudio: callbacks.onAudio,
    onEnd: callbacks.onEnd,
    onError: callbacks.onError,
  };

  ws.on("open", () => {
    logger.info("ElevenLabs WebSocket connected");
  });

  ws.on("message", (data: WebSocket.Data) => {
    try {
      const msg = JSON.parse(data.toString());
      handleElevenLabsMessage(session, msg);
    } catch (err) {
      logger.error("Failed to parse ElevenLabs message", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  });

  ws.on("error", (err) => {
    logger.error("ElevenLabs WebSocket error", {
      error: err.message,
    });
    callbacks.onError(err);
  });

  ws.on("close", (code, reason) => {
    logger.info("ElevenLabs WebSocket closed", {
      code,
      reason: reason?.toString().slice(0, 100),
    });
    callbacks.onEnd(session.conversationId || "");
  });

  return session;
}

function handleElevenLabsMessage(
  session: ElevenLabsSession,
  msg: Record<string, unknown>
): void {
  const type = msg.type as string;

  switch (type) {
    case "conversation_initiation_metadata": {
      const metadata = msg as {
        conversation_id?: string;
      };
      session.conversationId = metadata.conversation_id || null;
      logger.info("ElevenLabs conversation started", {
        conversationId: session.conversationId?.slice(0, 12),
      });
      break;
    }

    case "audio": {
      const audioMsg = msg as {
        audio?: { chunk?: string };
      };
      const chunk = audioMsg.audio?.chunk;
      if (chunk) {
        session.onAudio(chunk);
      }
      break;
    }

    case "ping": {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.send(JSON.stringify({ type: "pong" }));
      }
      break;
    }

    case "agent_response":
    case "user_transcript":
      break;

    default:
      logger.debug("Unhandled ElevenLabs message type", { type });
  }
}

/**
 * Send audio to an ElevenLabs session.
 */
export function sendAudioToElevenLabs(
  session: ElevenLabsSession,
  pcm16kBase64: string
): void {
  if (session.ws.readyState !== WebSocket.OPEN) return;

  const buffered = session.ws.bufferedAmount;
  if (buffered > 512_000) {
    logger.warn("ElevenLabs backpressure, dropping audio frame", {
      buffered,
    });
    return;
  }

  session.ws.send(
    JSON.stringify({
      user_audio_chunk: pcm16kBase64,
    })
  );
}

/**
 * Close an ElevenLabs session gracefully.
 */
export function closeElevenLabsSession(session: ElevenLabsSession): void {
  if (session.ws.readyState === WebSocket.OPEN) {
    session.ws.close(1000, "call_ended");
  }
}

import WebSocket from "ws";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

export interface ElevenLabsSession {
  ws: WebSocket;
  conversationId: string | null;
  onAudio: (audioBase64: string) => void;
  onEnd: (conversationId: string) => void;
  onError: (error: Error) => void;
}

export function createElevenLabsSession(callbacks: {
  agentId: string;
  finalPrompt: string;
  greetingText: string;
  onAudio: (audioBase64: string) => void;
  onEnd: (conversationId: string) => void;
  onError: (error: Error) => void;
}): ElevenLabsSession {
  const url = `${config.elevenlabsWsUrl}?agent_id=${callbacks.agentId}`;

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

    const initConfig: Record<string, unknown> = {
      type: "conversation_initiation_client_data",
      conversation_config_override: {
        agent: {
          prompt: { prompt: callbacks.finalPrompt },
          first_message: callbacks.greetingText,
        },
        user_input_audio_format: "mulaw_8000",
        agent_output_audio_format: "mulaw_8000",
      },
    };

    ws.send(JSON.stringify(initConfig));
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

    case "interruption": {
      break;
    }

    case "ping": {
      const pingMsg = msg as { ping_event?: { event_id?: number } };
      if (
        session.ws.readyState === WebSocket.OPEN &&
        pingMsg.ping_event?.event_id
      ) {
        session.ws.send(
          JSON.stringify({
            type: "pong",
            event_id: pingMsg.ping_event.event_id,
          })
        );
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

export function sendAudioToElevenLabs(
  session: ElevenLabsSession,
  audioBase64: string
): void {
  if (session.ws.readyState !== WebSocket.OPEN) return;

  const buffered = session.ws.bufferedAmount;
  if (buffered > config.elevenlabsBufferLimitBytes) {
    logger.warn("ElevenLabs backpressure, dropping audio frame", {
      buffered,
    });
    return;
  }

  session.ws.send(
    JSON.stringify({
      user_audio_chunk: audioBase64,
    })
  );
}

export function closeElevenLabsSession(session: ElevenLabsSession): void {
  if (session.ws.readyState === WebSocket.OPEN) {
    session.ws.close(1000, "call_ended");
  }
}

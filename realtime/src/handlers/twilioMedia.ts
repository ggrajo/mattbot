import type { IncomingMessage } from "node:http";
import WebSocket from "ws";
import { config } from "../config.js";
import {
  closeElevenLabsSession,
  createElevenLabsSession,
  sendAudioToElevenLabs,
  type ElevenLabsSession,
} from "../services/elevenlabs.js";
import { emitEvent } from "../services/eventEmitter.js";
import { fetchAgentRuntime } from "../services/agentRuntime.js";
import { fanOutToUser } from "./userEvents.js";
import type { SessionContext, TwilioMessage } from "../types.js";
import { logger } from "../utils/logger.js";
import { InvalidTokenError, verifySessionToken } from "../utils/token.js";

const activeSessions = new Map<string, SessionContext>();
const userSessionCounts = new Map<string, number>();

export function getActiveSessionCount(): number {
  return activeSessions.size;
}

export function handleTwilioConnection(
  ws: WebSocket,
  _req: IncomingMessage
): void {
  let sessionCtx: SessionContext | null = null;
  let elSession: ElevenLabsSession | null = null;

  logger.info("Twilio WebSocket connection opened");

  ws.on("message", (data: WebSocket.Data) => {
    try {
      const msg: TwilioMessage = JSON.parse(data.toString());
      handleMessage(ws, msg);
    } catch (err) {
      logger.error("Failed to parse Twilio message", {
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  });

  ws.on("close", (code, reason) => {
    logger.info("Twilio WebSocket closed", {
      code,
      callId: sessionCtx?.callId?.slice(0, 8),
    });
    cleanup("twilio_close");
  });

  ws.on("error", (err) => {
    logger.error("Twilio WebSocket error", {
      error: err.message,
      callId: sessionCtx?.callId?.slice(0, 8),
    });
    cleanup("twilio_error");
  });

  function handleMessage(twilioWs: WebSocket, msg: TwilioMessage): void {
    switch (msg.event) {
      case "connected":
        logger.info("Twilio stream connected");
        break;

      case "start":
        handleStart(twilioWs, msg);
        break;

      case "media":
        handleMedia(msg);
        break;

      case "stop":
        logger.info("Twilio stream stop received", {
          callId: sessionCtx?.callId?.slice(0, 8),
        });
        cleanup("twilio_stop");
        break;

      case "mark":
        break;
    }
  }

  async function handleStart(
    twilioWs: WebSocket,
    msg: TwilioMessage & { event: "start" }
  ): Promise<void> {
    const params = msg.start.customParameters;
    const token = params.session_token;
    const callId = params.call_id;
    const userId = params.user_id;

    try {
      verifySessionToken(token);
    } catch (err) {
      if (err instanceof InvalidTokenError) {
        logger.warn("Invalid session token, closing connection", {
          callId: callId?.slice(0, 8),
          reason: err.message,
        });
      }
      twilioWs.close(4001, "invalid_token");
      return;
    }

    if (activeSessions.size >= config.maxConcurrentSessions) {
      logger.warn("Max concurrent sessions reached, rejecting");
      twilioWs.close(4002, "capacity_exceeded");
      return;
    }

    const userCount = userSessionCounts.get(userId) || 0;
    if (userCount >= config.maxSessionsPerUser) {
      logger.warn("Max per-user sessions reached", {
        userId: userId?.slice(0, 8),
      });
      twilioWs.close(4003, "user_limit_exceeded");
      return;
    }

    sessionCtx = {
      callId,
      userId,
      providerCallSid: params.provider_call_sid || msg.start.callSid,
      streamSid: msg.start.streamSid,
      conversationId: null,
      startedAt: Date.now(),
      callerPhone: params.caller_phone || "",
      userTimezone: params.user_timezone || "",
      transcriptSeq: 0,
    };

    activeSessions.set(callId, sessionCtx);
    userSessionCounts.set(userId, userCount + 1);

    const agentRuntime = await fetchAgentRuntime(callId);
    if (!agentRuntime) {
      logger.error("No agent runtime config, closing stream", {
        callId: callId.slice(0, 8),
      });
      twilioWs.close(4004, "no_agent_runtime");
      cleanup("no_agent_runtime");
      return;
    }

    const agentId = agentRuntime.elevenlabs_agent_id;
    if (!agentId) {
      logger.error("No ElevenLabs agent ID in runtime config", {
        callId: callId.slice(0, 8),
      });
      twilioWs.close(4005, "no_agent_id");
      cleanup("no_agent_id");
      return;
    }

    emitEvent({
      event_type: "stream_connected",
      call_id: callId,
      user_id: userId,
      timestamp: new Date().toISOString(),
    }).catch(() => {});

    const dynamicVars: Record<string, string> = {
      caller_phone: sessionCtx.callerPhone,
      user_timezone: sessionCtx.userTimezone,
      today_date: new Date().toISOString().split("T")[0]!,
      ...(agentRuntime.dynamic_variables ?? {}),
    };

    elSession = createElevenLabsSession({
      agentId,
      finalPrompt: agentRuntime.final_prompt,
      greetingText: agentRuntime.greeting_text,
      dynamicVariables: dynamicVars,
      onAudio: (audioBase64: string) => {
        if (twilioWs.readyState !== WebSocket.OPEN) return;

        twilioWs.send(
          JSON.stringify({
            event: "media",
            streamSid: sessionCtx!.streamSid,
            media: {
              payload: audioBase64,
            },
          })
        );
      },
      onTranscript: (role: string, text: string) => {
        if (!sessionCtx) return;
        sessionCtx.transcriptSeq++;
        fanOutToUser(sessionCtx.userId, {
          type: "LIVE_TRANSCRIPT",
          payload: {
            call_id: sessionCtx.callId,
            role,
            text,
            seq: sessionCtx.transcriptSeq,
            timestamp: new Date().toISOString(),
          },
        });
      },
      onEnd: (conversationId: string) => {
        if (sessionCtx) {
          sessionCtx.conversationId =
            conversationId || sessionCtx.conversationId;
        }
        cleanup("elevenlabs_close");
      },
      onError: (error: Error) => {
        logger.error("ElevenLabs session error", {
          callId: sessionCtx?.callId?.slice(0, 8),
          error: error.message.slice(0, 100),
        });
        cleanup("elevenlabs_error");
      },
    });

    emitEvent({
      event_type: "ai_session_created",
      call_id: callId,
      user_id: userId,
      timestamp: new Date().toISOString(),
    }).catch(() => {});
  }

  function handleMedia(msg: TwilioMessage & { event: "media" }): void {
    if (!elSession) return;
    sendAudioToElevenLabs(elSession, msg.media.payload);
  }

  function cleanup(reason: string): void {
    if (!sessionCtx) return;

    const ctx = sessionCtx;
    const durationSeconds = Math.round(
      (Date.now() - ctx.startedAt) / 1000
    );

    const conversationId =
      elSession?.conversationId || ctx.conversationId || "";

    if (elSession) {
      closeElevenLabsSession(elSession);
      elSession = null;
    }

    if (ws.readyState === WebSocket.OPEN) {
      ws.close(1000, reason);
    }

    activeSessions.delete(ctx.callId);
    const count = userSessionCounts.get(ctx.userId) || 1;
    if (count <= 1) {
      userSessionCounts.delete(ctx.userId);
    } else {
      userSessionCounts.set(ctx.userId, count - 1);
    }

    fanOutToUser(ctx.userId, {
      type: "CALL_ENDED",
      payload: {
        call_id: ctx.callId,
        duration_seconds: durationSeconds,
        timestamp: new Date().toISOString(),
      },
    });

    const isError = reason.includes("error");

    emitEvent({
      event_type: isError ? "stream_error" : "stream_ended",
      call_id: ctx.callId,
      user_id: ctx.userId,
      timestamp: new Date().toISOString(),
      elevenlabs_conversation_id: conversationId,
      duration_seconds: durationSeconds,
      error_message: isError ? reason : undefined,
    }).catch(() => {});

    logger.info("Session cleaned up", {
      callId: ctx.callId.slice(0, 8),
      reason,
      durationSeconds,
    });

    sessionCtx = null;
  }
}

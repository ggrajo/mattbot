import "dotenv/config";
import express from "express";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import crypto from "crypto";

const PORT = parseInt(process.env.PORT || "3001", 10);
const BACKEND_INTERNAL_URL =
  process.env.BACKEND_INTERNAL_URL || "http://localhost:8000";
const INTERNAL_API_KEY = process.env.INTERNAL_NODE_API_KEY || "";
const INTERNAL_EVENT_SECRET = process.env.INTERNAL_EVENT_SECRET || "";
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || "";
const ELEVENLABS_WS_URL = "wss://api.elevenlabs.io/v1/convai/conversation";

const app = express();
app.use(express.json());

const server = createServer(app);

// ── Health ──────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// ── Internal HMAC helpers ───────────────────────────────────────────
function computeHmac(body) {
  const secret = INTERNAL_EVENT_SECRET || INTERNAL_API_KEY;
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function verifyHmac(body, signature) {
  const expected = computeHmac(body);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(signature, "hex")
    );
  } catch {
    return false;
  }
}

// ── Push events from backend to mobile WebSocket clients ────────────
const userSockets = new Map();

app.post("/internal/push-event", (req, res) => {
  const raw = JSON.stringify(req.body);
  const sig = req.headers["x-internal-signature"] || "";
  if (!verifyHmac(raw, sig)) {
    return res.status(403).json({ error: "Invalid signature" });
  }

  const { user_id, envelope } = req.body;
  if (!user_id || !envelope) {
    return res.status(400).json({ error: "Missing user_id or envelope" });
  }

  const clients = userSockets.get(user_id) || [];
  let sent = 0;
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(envelope));
      sent++;
    }
  }

  res.json({ received: true, sent });
});

// ── Send lifecycle event to backend ─────────────────────────────────
async function sendEventToBackend(eventPayload) {
  const body = JSON.stringify(eventPayload);
  const sig = computeHmac(body);

  try {
    const resp = await fetch(`${BACKEND_INTERNAL_URL}/internal/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Signature": sig,
      },
      body,
    });
    if (!resp.ok) {
      console.error(
        `Backend event POST failed: ${resp.status} ${await resp.text()}`
      );
    }
  } catch (err) {
    console.error("Failed to send event to backend:", err.message);
  }
}

// ── Fetch agent runtime config from backend ─────────────────────────
async function fetchAgentRuntime(callId) {
  try {
    const resp = await fetch(
      `${BACKEND_INTERNAL_URL}/internal/calls/${callId}/agent-runtime`,
      {
        headers: { "X-Internal-Api-Key": INTERNAL_API_KEY },
      }
    );
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    console.error("Failed to fetch agent runtime:", err.message);
    return null;
  }
}

// ── WebSocket servers ───────────────────────────────────────────────
const twilioWss = new WebSocketServer({ noServer: true });
const eventsWss = new WebSocketServer({ noServer: true });

server.on("upgrade", (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (url.pathname === "/twilio/media") {
    twilioWss.handleUpgrade(req, socket, head, (ws) => {
      twilioWss.emit("connection", ws, req);
    });
  } else if (url.pathname === "/ws/events") {
    const token = url.searchParams.get("token");
    if (!token) {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
      return;
    }
    eventsWss.handleUpgrade(req, socket, head, (ws) => {
      ws._userToken = token;
      eventsWss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

// ── /ws/events: Mobile app event fan-out ────────────────────────────
eventsWss.on("connection", async (ws, req) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const token = url.searchParams.get("token");

  let userId = null;
  try {
    const resp = await fetch(`${BACKEND_INTERNAL_URL}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (resp.ok) {
      const data = await resp.json();
      userId = data.id;
    }
  } catch {}

  if (!userId) {
    ws.close(4001, "Unauthorized");
    return;
  }

  ws._userId = userId;

  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(ws);

  ws.on("close", () => {
    const set = userSockets.get(userId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) userSockets.delete(userId);
    }
  });

  ws.send(JSON.stringify({ type: "connected", payload: { userId } }));
});

// ── /twilio/media: Twilio ↔ ElevenLabs audio bridge ─────────────────
twilioWss.on("connection", (twilioWs) => {
  console.log("Twilio Media Stream connected");

  let streamSid = null;
  let callId = null;
  let userId = null;
  let sessionToken = null;
  let callerPhone = null;
  let userTimezone = null;
  let providerCallSid = null;
  let elevenLabsWs = null;
  let conversationId = null;
  let callStartTime = Date.now();

  twilioWs.on("message", async (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }

    switch (msg.event) {
      case "start": {
        streamSid = msg.start?.streamSid;
        const params = msg.start?.customParameters || {};

        sessionToken = params.session_token;
        callId = params.call_id;
        userId = params.user_id;
        providerCallSid = params.provider_call_sid;
        callerPhone = params.caller_phone;
        userTimezone = params.user_timezone;

        console.log(
          `Stream started: call=${callId?.substring(0, 8)} stream=${streamSid?.substring(0, 12)}`
        );

        const runtime = await fetchAgentRuntime(callId);
        if (!runtime) {
          console.error("No agent runtime config, closing stream");
          twilioWs.close();
          return;
        }

        const agentId = runtime.elevenlabs_agent_id;
        if (!agentId) {
          console.error("No ElevenLabs agent ID in runtime config");
          twilioWs.close();
          return;
        }

        const elUrl = `${ELEVENLABS_WS_URL}?agent_id=${agentId}`;
        elevenLabsWs = new WebSocket(elUrl, {
          headers: { "xi-api-key": ELEVENLABS_API_KEY },
        });

        elevenLabsWs.on("open", () => {
          console.log("ElevenLabs WebSocket connected");

          const initConfig = {
            type: "conversation_initiation_client_data",
            conversation_config_override: {
              agent: {
                prompt: { prompt: runtime.final_prompt },
                first_message: runtime.greeting_text,
              },
            },
          };

          if (runtime.dynamic_variables) {
            initConfig.conversation_config_override.agent.dynamic_variables =
              runtime.dynamic_variables;
          }

          elevenLabsWs.send(JSON.stringify(initConfig));

          sendEventToBackend({
            event_type: "stream_connected",
            call_id: callId,
            user_id: userId,
            elevenlabs_conversation_id: "",
            timestamp: new Date().toISOString(),
          });
        });

        elevenLabsWs.on("message", (elData) => {
          let elMsg;
          try {
            elMsg = JSON.parse(elData.toString());
          } catch {
            return;
          }

          switch (elMsg.type) {
            case "conversation_initiation_metadata":
              conversationId = elMsg.conversation_id || "";
              sendEventToBackend({
                event_type: "ai_session_created",
                call_id: callId,
                user_id: userId,
                elevenlabs_conversation_id: conversationId,
                timestamp: new Date().toISOString(),
              });
              break;

            case "audio":
              if (elMsg.audio?.chunk && streamSid) {
                twilioWs.send(
                  JSON.stringify({
                    event: "media",
                    streamSid,
                    media: { payload: elMsg.audio.chunk },
                  })
                );
              }
              break;

            case "interruption":
              if (streamSid) {
                twilioWs.send(
                  JSON.stringify({ event: "clear", streamSid })
                );
              }
              break;

            case "ping":
              if (elMsg.ping_event?.event_id) {
                elevenLabsWs.send(
                  JSON.stringify({
                    type: "pong",
                    event_id: elMsg.ping_event.event_id,
                  })
                );
              }
              break;
          }
        });

        elevenLabsWs.on("close", () => {
          console.log("ElevenLabs WebSocket closed");
          const duration = Math.round((Date.now() - callStartTime) / 1000);
          sendEventToBackend({
            event_type: "stream_ended",
            call_id: callId,
            user_id: userId,
            elevenlabs_conversation_id: conversationId || "",
            duration_seconds: duration,
            timestamp: new Date().toISOString(),
          });
        });

        elevenLabsWs.on("error", (err) => {
          console.error("ElevenLabs WebSocket error:", err.message);
          sendEventToBackend({
            event_type: "stream_error",
            call_id: callId,
            user_id: userId,
            elevenlabs_conversation_id: conversationId || "",
            error_message: err.message,
            timestamp: new Date().toISOString(),
          });
        });

        break;
      }

      case "media": {
        if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
          elevenLabsWs.send(
            JSON.stringify({
              user_audio_chunk: msg.media.payload,
            })
          );
        }
        break;
      }

      case "stop": {
        console.log(`Stream stopped: ${streamSid?.substring(0, 12)}`);
        if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
          elevenLabsWs.close();
        }
        break;
      }
    }
  });

  twilioWs.on("close", () => {
    console.log("Twilio Media Stream disconnected");
    if (elevenLabsWs && elevenLabsWs.readyState === WebSocket.OPEN) {
      elevenLabsWs.close();
    }
  });

  twilioWs.on("error", (err) => {
    console.error("Twilio WebSocket error:", err.message);
  });
});

// ── Start server ────────────────────────────────────────────────────
server.listen(PORT, () => {
  console.log(`Realtime bridge listening on port ${PORT}`);
});

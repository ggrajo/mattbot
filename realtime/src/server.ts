import crypto from "node:crypto";
import express from "express";
import http from "node:http";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { healthCheck } from "./handlers/health.js";
import { handleTwilioConnection, getActiveSessionCount } from "./handlers/twilioMedia.js";
import { handleUserEventsConnection, pushEventToUser } from "./handlers/userEvents.js";
import { logger } from "./utils/logger.js";

function computeHmac(body: string): string {
  const secret = config.internalEventSecret || config.internalNodeApiKey;
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

function verifyHmac(body: string, signature: string): boolean {
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

export function createServer(): http.Server {
  const app = express();
  app.use(express.json());

  app.get("/health", healthCheck);

  app.post("/internal/push-event", (req, res) => {
    const raw = JSON.stringify(req.body);
    const sig = (req.headers["x-internal-signature"] as string) || "";
    if (!verifyHmac(raw, sig)) {
      res.status(403).json({ error: "Invalid signature" });
      return;
    }

    const { user_id, envelope } = req.body;
    if (!user_id || !envelope) {
      res.status(400).json({ error: "Missing user_id or envelope" });
      return;
    }

    const sent = pushEventToUser(user_id, envelope);
    res.json({ received: true, sent });
  });

  const server = http.createServer(app);

  const twilioWss = new WebSocketServer({ noServer: true });
  const eventsWss = new WebSocketServer({ noServer: true });

  twilioWss.on("connection", (ws, req) => {
    handleTwilioConnection(ws, req);
  });

  eventsWss.on("connection", (ws, req) => {
    handleUserEventsConnection(ws, req);
  });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);

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
        (ws as any)._userToken = token;
        eventsWss.emit("connection", ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  twilioWss.on("error", (err) => {
    logger.error("Twilio WebSocket server error", { error: err.message });
  });

  eventsWss.on("error", (err) => {
    logger.error("Events WebSocket server error", { error: err.message });
  });

  return server;
}

export function startServer(): http.Server {
  const server = createServer();

  server.listen(config.port, () => {
    logger.info(`Realtime bridge listening on port ${config.port}`);
  });

  return server;
}

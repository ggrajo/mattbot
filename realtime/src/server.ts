import express from "express";
import http from "node:http";
import { WebSocketServer } from "ws";
import { config } from "./config.js";
import { healthCheck } from "./handlers/health.js";
import { handleTwilioConnection } from "./handlers/twilioMedia.js";
import { logger } from "./utils/logger.js";

export function createServer(): http.Server {
  const app = express();
  app.use(express.json());

  app.get("/health", healthCheck);

  const server = http.createServer(app);

  const wss = new WebSocketServer({ server, path: "/twilio/media" });

  wss.on("connection", (ws, req) => {
    handleTwilioConnection(ws, req);
  });

  wss.on("error", (err) => {
    logger.error("WebSocket server error", { error: err.message });
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

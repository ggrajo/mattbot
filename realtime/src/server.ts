import http from 'node:http';
import { URL } from 'node:url';
import express from 'express';
import { WebSocketServer, type WebSocket } from 'ws';
import { config } from './config.js';
import { createChildLogger } from './utils/logger.js';
import { validateSessionToken } from './utils/token.js';
import { healthHandler } from './handlers/health.js';
import { TwilioMediaHandler } from './handlers/twilioMedia.js';

const log = createChildLogger('server');

const activeSessions = new Map<string, TwilioMediaHandler>();

export function createServer() {
  const app = express();
  app.use(express.json());

  app.get('/health', healthHandler);

  app.get('/stats', (_req, res) => {
    res.json({
      activeSessions: activeSessions.size,
      maxSessions: config.MAX_CONCURRENT_SESSIONS,
    });
  });

  const server = http.createServer(app);

  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url || '/', `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname !== '/ws/twilio') {
      log.warn({ pathname }, 'WebSocket upgrade rejected: unknown path');
      socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
      socket.destroy();
      return;
    }

    if (activeSessions.size >= config.MAX_CONCURRENT_SESSIONS) {
      log.warn('WebSocket upgrade rejected: max sessions reached');
      socket.write('HTTP/1.1 503 Service Unavailable\r\n\r\n');
      socket.destroy();
      return;
    }

    const token = url.searchParams.get('token');
    if (!token) {
      log.warn('WebSocket upgrade rejected: missing token');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    const payload = validateSessionToken(token);
    if (!payload) {
      log.warn('WebSocket upgrade rejected: invalid token');
      socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
      socket.destroy();
      return;
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request, payload);
    });
  });

  wss.on('connection', (ws: WebSocket, _request, payload: { sub: string; callId: string }) => {
    log.info({ userId: payload.sub, callId: payload.callId }, 'New Twilio WebSocket connection');

    const handler = new TwilioMediaHandler(ws, payload.sub, payload.callId);
    activeSessions.set(handler.id, handler);

    ws.on('close', () => {
      activeSessions.delete(handler.id);
      log.info(
        { sessionId: handler.id, activeSessions: activeSessions.size },
        'Session removed',
      );
    });
  });

  return { app, server, wss };
}

export function getActiveSessions(): Map<string, TwilioMediaHandler> {
  return activeSessions;
}

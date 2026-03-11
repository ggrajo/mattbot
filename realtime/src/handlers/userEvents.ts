import type { IncomingMessage } from "node:http";
import WebSocket from "ws";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";

const userSockets = new Map<string, Set<WebSocket>>();

const VALID_EVENT_TYPES = new Set([
  "CALL_STARTED",
  "CALL_ENDED",
  "HANDOFF_REQUEST",
  "HANDOFF_ACCEPT_REQUEST",
  "HANDOFF_DECLINE_REQUEST",
  "LIVE_TRANSCRIPT",
  "MESSAGE_TAKEN",
  "SCREENING_COMPLETE",
]);

export function fanOutToUser(
  userId: string,
  envelope: { type: string; payload: Record<string, unknown> }
): void {
  const clients = userSockets.get(userId);
  if (!clients) return;

  const data = JSON.stringify(envelope);
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

export async function handleUserEventsConnection(
  ws: WebSocket,
  req: IncomingMessage
): Promise<void> {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const token = url.searchParams.get("token") || (ws as any)._userToken;

  if (!token) {
    ws.close(4001, "missing_token");
    return;
  }

  let userId: string | null = null;

  try {
    const resp = await fetch(`${config.backendInternalUrl}/api/v1/me`, {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(config.wsAuthTimeoutMs),
    });

    if (resp.ok) {
      const data = (await resp.json()) as { id: string };
      userId = data.id;
    }
  } catch (err) {
    logger.error("User auth failed", {
      error: err instanceof Error ? err.message : "unknown",
    });
  }

  if (!userId) {
    ws.close(4001, "invalid_token");
    return;
  }

  (ws as any)._userId = userId;

  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId)!.add(ws);

  logger.info("User events WebSocket connected", {
    userId: userId.slice(0, 8),
  });

  ws.on("close", () => {
    const set = userSockets.get(userId!);
    if (set) {
      set.delete(ws);
      if (set.size === 0) userSockets.delete(userId!);
    }
    logger.info("User events WebSocket disconnected", {
      userId: userId?.slice(0, 8),
    });
  });

  ws.send(JSON.stringify({ type: "connected", payload: { userId } }));
}

export function pushEventToUser(
  userId: string,
  envelope: Record<string, unknown>
): number {
  const clients = userSockets.get(userId);
  if (!clients) return 0;

  const data = JSON.stringify(envelope);
  let sent = 0;
  for (const ws of clients) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
      sent++;
    }
  }
  return sent;
}

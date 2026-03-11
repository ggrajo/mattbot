import crypto from "node:crypto";
import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import type { BridgeEvent } from "../types.js";

/**
 * Emit lifecycle events to the FastAPI backend with HMAC signature.
 */
export async function emitEvent(event: BridgeEvent): Promise<void> {
  const url = `${config.backendInternalUrl}/internal/events`;
  const body = JSON.stringify(event);
  const signature = crypto
    .createHmac("sha256", config.internalEventSecret)
    .update(body)
    .digest("hex");

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Signature": signature,
      },
      body,
      signal: AbortSignal.timeout(config.eventEmissionTimeoutMs),
    });

    if (!resp.ok) {
      logger.warn("Backend event emission failed", {
        status: resp.status,
        eventType: event.event_type,
        callId: event.call_id,
      });
    }
  } catch (err) {
    logger.error("Failed to emit event to backend", {
      eventType: event.event_type,
      callId: event.call_id,
      error: err instanceof Error ? err.message : "unknown",
    });
  }
}

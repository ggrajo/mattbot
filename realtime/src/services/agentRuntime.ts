import { config } from "../config.js";
import { logger } from "../utils/logger.js";
import type { AgentRuntime } from "../types.js";

export async function fetchAgentRuntime(
  callId: string
): Promise<AgentRuntime | null> {
  const url = `${config.backendInternalUrl}/internal/calls/${callId}/agent-runtime`;

  try {
    const resp = await fetch(url, {
      headers: { "X-Internal-Api-Key": config.internalNodeApiKey },
      signal: AbortSignal.timeout(config.agentRuntimeFetchTimeoutMs),
    });

    if (!resp.ok) {
      logger.warn("Failed to fetch agent runtime", {
        callId: callId.slice(0, 8),
        status: resp.status,
      });
      return null;
    }

    return (await resp.json()) as AgentRuntime;
  } catch (err) {
    logger.error("Agent runtime fetch error", {
      callId: callId.slice(0, 8),
      error: err instanceof Error ? err.message : "unknown",
    });
    return null;
  }
}

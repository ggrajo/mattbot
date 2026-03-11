import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || "",
  elevenlabsAgentId: process.env.ELEVENLABS_AGENT_ID || "",
  elevenlabsWsUrl:
    process.env.ELEVENLABS_WS_URL ||
    "wss://api.elevenlabs.io/v1/convai/conversation",
  elevenlabsBufferLimitBytes: parseInt(
    process.env.ELEVENLABS_BUFFER_LIMIT_BYTES || "512000",
    10
  ),
  internalEventSecret: process.env.INTERNAL_EVENT_SECRET || "",
  internalNodeApiKey: process.env.INTERNAL_NODE_API_KEY || "",
  jwtSigningKey: process.env.JWT_SIGNING_KEY || "",
  logLevel: process.env.LOG_LEVEL || "info",
  backendInternalUrl:
    process.env.BACKEND_INTERNAL_URL || "http://localhost:8000",
  maxConcurrentSessions: parseInt(
    process.env.MAX_CONCURRENT_SESSIONS || "10",
    10
  ),
  maxSessionsPerUser: parseInt(
    process.env.MAX_SESSIONS_PER_USER || "2",
    10
  ),
  wsAuthTimeoutMs: parseInt(process.env.WS_AUTH_TIMEOUT_MS || "5000", 10),
  agentRuntimeFetchTimeoutMs: parseInt(
    process.env.AGENT_RUNTIME_FETCH_TIMEOUT_MS || "5000",
    10
  ),
  eventEmissionTimeoutMs: parseInt(
    process.env.EVENT_EMISSION_TIMEOUT_MS || "10000",
    10
  ),
  handoffDecisionTimeoutMs: parseInt(
    process.env.HANDOFF_DECISION_TIMEOUT_MS || "10000",
    10
  ),
} as const;

import "dotenv/config";

export const config = {
  port: parseInt(process.env.PORT || "3001", 10),
  elevenlabsApiKey: process.env.ELEVENLABS_API_KEY || "",
  elevenlabsAgentId: process.env.ELEVENLABS_AGENT_ID || "",
  internalEventSecret: process.env.INTERNAL_EVENT_SECRET || "",
  backendInternalUrl: process.env.BACKEND_INTERNAL_URL || "http://localhost:8000",
  maxConcurrentSessions: parseInt(process.env.MAX_CONCURRENT_SESSIONS || "10", 10),
  maxSessionsPerUser: parseInt(process.env.MAX_SESSIONS_PER_USER || "2", 10),
} as const;

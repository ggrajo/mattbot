import dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] || fallback;
}

function optionalInt(key: string, fallback: number): number {
  const raw = process.env[key];
  return raw ? parseInt(raw, 10) : fallback;
}

export const config = {
  PORT: optionalInt('PORT', 3001),
  BACKEND_INTERNAL_URL: optional('BACKEND_INTERNAL_URL', 'http://localhost:8000'),
  INTERNAL_NODE_API_KEY: optional('INTERNAL_NODE_API_KEY', ''),
  INTERNAL_EVENT_SECRET: optional('INTERNAL_EVENT_SECRET', ''),
  ELEVENLABS_API_KEY: required('ELEVENLABS_API_KEY'),
  ELEVENLABS_AGENT_ID: optional('ELEVENLABS_AGENT_ID', ''),
  ELEVENLABS_WS_URL: optional(
    'ELEVENLABS_WS_URL',
    'wss://api.elevenlabs.io/v1/convai/conversation',
  ),
  ELEVENLABS_BUFFER_LIMIT_BYTES: optionalInt('ELEVENLABS_BUFFER_LIMIT_BYTES', 512_000),
  JWT_SIGNING_KEY: required('JWT_SIGNING_KEY'),
  LOG_LEVEL: optional('LOG_LEVEL', 'info'),
  MAX_CONCURRENT_SESSIONS: optionalInt('MAX_CONCURRENT_SESSIONS', 10),
  MAX_SESSIONS_PER_USER: optionalInt('MAX_SESSIONS_PER_USER', 2),
  WS_AUTH_TIMEOUT_MS: optionalInt('WS_AUTH_TIMEOUT_MS', 5_000),
  AGENT_RUNTIME_FETCH_TIMEOUT_MS: optionalInt('AGENT_RUNTIME_FETCH_TIMEOUT_MS', 5_000),
  EVENT_EMISSION_TIMEOUT_MS: optionalInt('EVENT_EMISSION_TIMEOUT_MS', 10_000),
  HANDOFF_DECISION_TIMEOUT_MS: optionalInt('HANDOFF_DECISION_TIMEOUT_MS', 10_000),
} as const;

import axios from 'axios';
import { config } from '../config.js';
import { createChildLogger } from '../utils/logger.js';
import type { AgentRuntimeConfig } from '../types.js';
import type { CallerMemoryContext } from './elevenlabs.js';

const log = createChildLogger('agentRuntime');

const DEFAULT_RUNTIME: AgentRuntimeConfig = {
  agentId: '',
  systemPrompt: [
    'You are Matt, a friendly AI assistant answering a phone call on behalf of the user.',
    'Your job is to screen incoming calls, determine the caller\'s intent, and either take a message or offer to transfer.',
    'Be polite, concise, and helpful. Ask clarifying questions if needed.',
    'If the caller wants to leave a message, collect it and confirm.',
    'If the caller insists on speaking with the user, offer to transfer.',
  ].join(' '),
  greeting: 'Hello, this is Matt, an AI assistant. How can I help you?',
  voiceId: '',
  language: 'en',
  maxDurationSeconds: 300,
  tools: [],
};

/**
 * Fetch agent runtime configuration from the backend for a specific call.
 * Falls back to defaults if the backend is unreachable or returns an error.
 */
export async function fetchAgentRuntime(
  callId: string,
  userId: string,
): Promise<AgentRuntimeConfig> {
  try {
    const response = await axios.get<AgentRuntimeConfig>(
      `${config.BACKEND_INTERNAL_URL}/api/v1/internal/agent-runtime/${callId}`,
      {
        headers: {
          'X-Internal-API-Key': config.INTERNAL_NODE_API_KEY,
          'X-User-Id': userId,
        },
        timeout: config.AGENT_RUNTIME_FETCH_TIMEOUT_MS,
      },
    );

    log.info({ callId }, 'Fetched agent runtime config from backend');
    return { ...DEFAULT_RUNTIME, ...response.data };
  } catch (err) {
    log.warn({ err, callId }, 'Failed to fetch agent runtime, using defaults');
    return { ...DEFAULT_RUNTIME, agentId: config.ELEVENLABS_AGENT_ID };
  }
}

/**
 * Build the effective system prompt, optionally merging per-user customisations
 * from the backend config with the base default.
 */
export function buildSystemPrompt(
  runtimeConfig: AgentRuntimeConfig,
  callerNumber: string,
  calledNumber: string,
): string {
  const context = [
    runtimeConfig.systemPrompt,
    '',
    `Caller number: ${callerNumber}`,
    `Called number: ${calledNumber}`,
    `Max call duration: ${runtimeConfig.maxDurationSeconds} seconds`,
  ].join('\n');

  return context;
}

/**
 * Fetch caller memory context from the backend for a known caller.
 * Returns undefined if the caller has no stored memories.
 */
export async function fetchCallerMemory(
  userId: string,
  callerPhoneHash: string,
): Promise<CallerMemoryContext | undefined> {
  try {
    const response = await axios.get(
      `${config.BACKEND_INTERNAL_URL}/api/v1/internal/caller-memory/${callerPhoneHash}`,
      {
        headers: {
          'X-Internal-API-Key': config.INTERNAL_NODE_API_KEY,
          'X-User-Id': userId,
        },
        timeout: config.AGENT_RUNTIME_FETCH_TIMEOUT_MS,
      },
    );

    const data = response.data;
    if (!data || !data.memories || data.memories.length === 0) {
      return undefined;
    }

    log.info({ userId, callerPhoneHash, memoryCount: data.memories.length }, 'Fetched caller memory from backend');
    return {
      callerPhoneHash,
      callerName: data.caller_name,
      memories: data.memories.map((m: { memory_type: string; content: string; importance: number }) => ({
        type: m.memory_type,
        content: m.content,
        importance: m.importance,
      })),
    };
  } catch (err) {
    log.debug({ err, callerPhoneHash }, 'No caller memory available');
    return undefined;
  }
}

export { DEFAULT_RUNTIME };

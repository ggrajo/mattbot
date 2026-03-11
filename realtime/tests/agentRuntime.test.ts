import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('../src/config.js', () => ({
  config: {
    BACKEND_INTERNAL_URL: 'http://localhost:8000',
    INTERNAL_NODE_API_KEY: 'test-api-key',
    ELEVENLABS_AGENT_ID: 'fallback-agent-id',
    AGENT_RUNTIME_FETCH_TIMEOUT_MS: 5000,
    LOG_LEVEL: 'silent',
  },
}));

vi.mock('axios');

import {
  fetchAgentRuntime,
  buildSystemPrompt,
  DEFAULT_RUNTIME,
} from '../src/services/agentRuntime.js';

describe('agentRuntime', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchAgentRuntime', () => {
    it('should return backend config when available', async () => {
      const backendConfig = {
        agentId: 'custom-agent',
        systemPrompt: 'Custom prompt',
        greeting: 'Hi there',
        voiceId: 'voice-2',
        language: 'es',
        maxDurationSeconds: 120,
        tools: [],
      };

      vi.mocked(axios.get).mockResolvedValueOnce({ data: backendConfig });

      const result = await fetchAgentRuntime('call-1', 'user-1');

      expect(result.agentId).toBe('custom-agent');
      expect(result.systemPrompt).toBe('Custom prompt');
      expect(result.language).toBe('es');

      expect(axios.get).toHaveBeenCalledWith(
        'http://localhost:8000/api/v1/internal/agent-runtime/call-1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-Internal-API-Key': 'test-api-key',
            'X-User-Id': 'user-1',
          }),
        }),
      );
    });

    it('should fall back to defaults when backend fails', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce(new Error('Network error'));

      const result = await fetchAgentRuntime('call-1', 'user-1');

      expect(result.agentId).toBe('fallback-agent-id');
      expect(result.systemPrompt).toBe(DEFAULT_RUNTIME.systemPrompt);
    });

    it('should merge backend partial config with defaults', async () => {
      vi.mocked(axios.get).mockResolvedValueOnce({
        data: { agentId: 'partial-agent', voiceId: 'custom-voice' },
      });

      const result = await fetchAgentRuntime('call-1', 'user-1');

      expect(result.agentId).toBe('partial-agent');
      expect(result.voiceId).toBe('custom-voice');
      expect(result.systemPrompt).toBe(DEFAULT_RUNTIME.systemPrompt);
      expect(result.language).toBe('en');
    });
  });

  describe('buildSystemPrompt', () => {
    it('should include the system prompt', () => {
      const prompt = buildSystemPrompt(DEFAULT_RUNTIME, '+15551234567', '+15559876543');
      expect(prompt).toContain(DEFAULT_RUNTIME.systemPrompt);
    });

    it('should include caller and called numbers', () => {
      const prompt = buildSystemPrompt(DEFAULT_RUNTIME, '+15551234567', '+15559876543');
      expect(prompt).toContain('+15551234567');
      expect(prompt).toContain('+15559876543');
    });

    it('should include max duration', () => {
      const prompt = buildSystemPrompt(
        { ...DEFAULT_RUNTIME, maxDurationSeconds: 120 },
        '+15551234567',
        '+15559876543',
      );
      expect(prompt).toContain('120');
    });
  });
});

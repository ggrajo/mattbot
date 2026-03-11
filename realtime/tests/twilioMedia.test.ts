import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

vi.mock('../src/config.js', () => ({
  config: {
    ELEVENLABS_API_KEY: 'test-key',
    ELEVENLABS_AGENT_ID: 'test-agent',
    ELEVENLABS_WS_URL: 'wss://api.elevenlabs.io/v1/convai/conversation',
    ELEVENLABS_BUFFER_LIMIT_BYTES: 512000,
    BACKEND_INTERNAL_URL: 'http://localhost:8000',
    INTERNAL_NODE_API_KEY: 'test-api-key',
    INTERNAL_EVENT_SECRET: 'test-secret',
    EVENT_EMISSION_TIMEOUT_MS: 5000,
    AGENT_RUNTIME_FETCH_TIMEOUT_MS: 5000,
    LOG_LEVEL: 'silent',
    JWT_SIGNING_KEY: 'test-jwt-secret',
  },
}));

vi.mock('../src/services/elevenlabs.js', () => ({
  ElevenLabsClient: vi.fn().mockImplementation(() => {
    const emitter = new EventEmitter();
    return Object.assign(emitter, {
      connect: vi.fn(),
      disconnect: vi.fn(),
      sendAudio: vi.fn(),
      sendToolResult: vi.fn(),
      isConnected: true,
      getConversationId: vi.fn(() => null),
    });
  }),
}));

vi.mock('../src/services/eventEmitter.js', () => ({
  backendEvents: {
    callStarted: vi.fn().mockResolvedValue(undefined),
    callEnded: vi.fn().mockResolvedValue(undefined),
    transcriptUpdate: vi.fn().mockResolvedValue(undefined),
    toolCall: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('../src/services/agentRuntime.js', () => ({
  fetchAgentRuntime: vi.fn().mockResolvedValue({
    agentId: 'test-agent',
    systemPrompt: 'Test prompt',
    greeting: 'Hello',
    voiceId: 'voice-1',
    language: 'en',
    maxDurationSeconds: 300,
    tools: [],
  }),
  buildSystemPrompt: vi.fn().mockReturnValue('Built prompt'),
}));

import { TwilioMediaHandler } from '../src/handlers/twilioMedia.js';
import { backendEvents } from '../src/services/eventEmitter.js';

function createMockWs() {
  const emitter = new EventEmitter();
  return Object.assign(emitter, {
    send: vi.fn(),
    close: vi.fn(),
    readyState: 1,
    OPEN: 1,
    CLOSED: 3,
  });
}

describe('TwilioMediaHandler', () => {
  let mockWs: ReturnType<typeof createMockWs>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWs = createMockWs();
  });

  it('should create a handler with a session ID', () => {
    const handler = new TwilioMediaHandler(mockWs as any, 'user-1', 'call-1');
    expect(handler.id).toBeDefined();
    expect(typeof handler.id).toBe('string');
  });

  it('should handle a connected event without errors', () => {
    new TwilioMediaHandler(mockWs as any, 'user-1', 'call-1');

    expect(() => {
      mockWs.emit('message', JSON.stringify({ event: 'connected', protocol: 'Call', version: '1.0' }));
    }).not.toThrow();
  });

  it('should handle a start event and emit callStarted', async () => {
    new TwilioMediaHandler(mockWs as any, 'user-1', 'call-1');

    const startMsg = {
      event: 'start',
      sequenceNumber: '1',
      start: {
        streamSid: 'MZ_stream',
        accountSid: 'AC_test',
        callSid: 'CA_test',
        tracks: ['inbound'],
        customParameters: { from: '+15551234567', to: '+15559876543' },
        mediaFormat: { encoding: 'audio/x-mulaw', sampleRate: 8000, channels: 1 },
      },
      streamSid: 'MZ_stream',
    };

    mockWs.emit('message', JSON.stringify(startMsg));

    // Allow async operations to settle
    await new Promise((r) => setTimeout(r, 50));

    expect(backendEvents.callStarted).toHaveBeenCalledWith(
      'call-1',
      'CA_test',
      expect.any(String),
      expect.objectContaining({ fromNumber: '+15551234567' }),
    );
  });

  it('should handle a stop event without errors', () => {
    new TwilioMediaHandler(mockWs as any, 'user-1', 'call-1');

    const stopMsg = {
      event: 'stop',
      sequenceNumber: '99',
      stop: { accountSid: 'AC_test', callSid: 'CA_test' },
      streamSid: 'MZ_stream',
    };

    expect(() => {
      mockWs.emit('message', JSON.stringify(stopMsg));
    }).not.toThrow();
  });

  it('should handle non-JSON messages gracefully', () => {
    new TwilioMediaHandler(mockWs as any, 'user-1', 'call-1');

    expect(() => {
      mockWs.emit('message', 'not json');
    }).not.toThrow();
  });

  it('should cleanup on WebSocket close', () => {
    new TwilioMediaHandler(mockWs as any, 'user-1', 'call-1');
    expect(() => mockWs.emit('close')).not.toThrow();
  });
});

// ─── Twilio Media Stream ────────────────────────────────────────────────────

export interface TwilioConnectedMessage {
  event: 'connected';
  protocol: string;
  version: string;
}

export interface TwilioStartMessage {
  event: 'start';
  sequenceNumber: string;
  start: {
    streamSid: string;
    accountSid: string;
    callSid: string;
    tracks: string[];
    customParameters: Record<string, string>;
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
  };
  streamSid: string;
}

export interface TwilioMediaMessage {
  event: 'media';
  sequenceNumber: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string; // base64 mulaw audio
  };
  streamSid: string;
}

export interface TwilioStopMessage {
  event: 'stop';
  sequenceNumber: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
  streamSid: string;
}

export type TwilioStreamMessage =
  | TwilioConnectedMessage
  | TwilioStartMessage
  | TwilioMediaMessage
  | TwilioStopMessage;

// ─── ElevenLabs Conversational AI ───────────────────────────────────────────

export interface ElevenLabsAudioMessage {
  type: 'audio';
  audio: {
    chunk: string; // base64 PCM audio
    sample_rate: number;
  };
}

export interface ElevenLabsTranscriptMessage {
  type: 'transcript';
  transcript: {
    text: string;
    is_final: boolean;
    role: 'user' | 'agent';
  };
}

export interface ElevenLabsToolCallMessage {
  type: 'tool_call';
  tool_call: {
    tool_name: string;
    parameters: Record<string, unknown>;
    tool_call_id: string;
  };
}

export interface ElevenLabsConversationEndMessage {
  type: 'conversation_end';
  conversation_id: string;
}

export interface ElevenLabsErrorMessage {
  type: 'error';
  error: {
    message: string;
    code?: string;
  };
}

export interface ElevenLabsPingMessage {
  type: 'ping';
}

export type ElevenLabsMessage =
  | ElevenLabsAudioMessage
  | ElevenLabsTranscriptMessage
  | ElevenLabsToolCallMessage
  | ElevenLabsConversationEndMessage
  | ElevenLabsErrorMessage
  | ElevenLabsPingMessage;

// ─── Call Session ───────────────────────────────────────────────────────────

export interface CallSession {
  sessionId: string;
  callSid: string;
  streamSid: string;
  userId: string;
  callId: string;
  fromNumber: string;
  toNumber: string;
  startedAt: Date;
  transcriptParts: TranscriptPart[];
}

export interface TranscriptPart {
  role: 'user' | 'agent';
  text: string;
  timestamp: Date;
  isFinal: boolean;
}

// ─── Agent Runtime ──────────────────────────────────────────────────────────

export interface AgentRuntimeConfig {
  agentId: string;
  systemPrompt: string;
  greeting: string;
  voiceId: string;
  language: string;
  maxDurationSeconds: number;
  tools: AgentTool[];
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

// ─── Backend Event Payloads ─────────────────────────────────────────────────

export interface CallEventPayload {
  callId: string;
  callSid: string;
  sessionId: string;
  eventType: string;
  timestamp: string;
  data: Record<string, unknown>;
}

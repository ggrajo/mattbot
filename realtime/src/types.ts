export interface TwilioStartMessage {
  event: "start";
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
  event: "media";
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
  event: "stop";
  sequenceNumber: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
  streamSid: string;
}

export type TwilioMessage =
  | { event: "connected"; protocol: string; version: string }
  | TwilioStartMessage
  | TwilioMediaMessage
  | TwilioStopMessage
  | { event: "mark"; sequenceNumber: string; mark: { name: string } };

export interface SessionContext {
  callId: string;
  userId: string;
  providerCallSid: string;
  streamSid: string;
  conversationId: string | null;
  startedAt: number;
  callerPhone: string;
  userTimezone: string;
  transcriptSeq: number;
}

export interface BridgeEvent {
  event_type: string;
  call_id: string;
  user_id: string;
  timestamp: string;
  elevenlabs_conversation_id?: string;
  duration_seconds?: number;
  error_message?: string;
}

export interface AgentRuntime {
  elevenlabs_agent_id: string;
  final_prompt: string;
  greeting_text: string;
  dynamic_variables?: Record<string, string>;
  business_hours_enabled: boolean;
  business_hours_start: string | null;
  business_hours_end: string | null;
  business_hours_days: number[];
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_days: number[];
  quiet_hours_allow_vip: boolean;
  timezone: string;
}

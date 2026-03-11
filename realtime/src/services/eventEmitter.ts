import crypto from 'node:crypto';
import axios from 'axios';
import { config } from '../config.js';
import { createChildLogger } from '../utils/logger.js';
import type { CallEventPayload } from '../types.js';

const log = createChildLogger('eventEmitter');

/**
 * Emit call lifecycle events to the backend API, signed with HMAC.
 */
export class BackendEventEmitter {
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secret: string;
  private readonly timeout: number;

  constructor() {
    this.baseUrl = config.BACKEND_INTERNAL_URL;
    this.apiKey = config.INTERNAL_NODE_API_KEY;
    this.secret = config.INTERNAL_EVENT_SECRET;
    this.timeout = config.EVENT_EMISSION_TIMEOUT_MS;
  }

  /** Compute HMAC-SHA256 hex signature over a payload string. */
  private sign(body: string): string {
    return crypto
      .createHmac('sha256', this.secret)
      .update(body)
      .digest('hex');
  }

  /** Post a call event to the backend. */
  async emitEvent(payload: CallEventPayload): Promise<void> {
    const bodyStr = JSON.stringify(payload);
    const signature = this.sign(bodyStr);

    try {
      await axios.post(
        `${this.baseUrl}/api/v1/internal/call-events`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-API-Key': this.apiKey,
            'X-Event-Signature': signature,
          },
          timeout: this.timeout,
        },
      );
      log.debug({ eventType: payload.eventType, callId: payload.callId }, 'Event emitted');
    } catch (err) {
      log.error({ err, eventType: payload.eventType }, 'Failed to emit event to backend');
    }
  }

  /** Convenience: emit a call_started event. */
  async callStarted(
    callId: string,
    callSid: string,
    sessionId: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.emitEvent({
      callId,
      callSid,
      sessionId,
      eventType: 'call_started',
      timestamp: new Date().toISOString(),
      data: extra,
    });
  }

  /** Convenience: emit a call_ended event. */
  async callEnded(
    callId: string,
    callSid: string,
    sessionId: string,
    extra: Record<string, unknown> = {},
  ): Promise<void> {
    await this.emitEvent({
      callId,
      callSid,
      sessionId,
      eventType: 'call_ended',
      timestamp: new Date().toISOString(),
      data: extra,
    });
  }

  /** Convenience: emit a transcript_update event. */
  async transcriptUpdate(
    callId: string,
    callSid: string,
    sessionId: string,
    text: string,
    role: string,
    isFinal: boolean,
  ): Promise<void> {
    await this.emitEvent({
      callId,
      callSid,
      sessionId,
      eventType: 'transcript_update',
      timestamp: new Date().toISOString(),
      data: { text, role, isFinal },
    });
  }

  /** Convenience: emit a tool_call event. */
  async toolCall(
    callId: string,
    callSid: string,
    sessionId: string,
    toolName: string,
    parameters: Record<string, unknown>,
  ): Promise<void> {
    await this.emitEvent({
      callId,
      callSid,
      sessionId,
      eventType: 'tool_call',
      timestamp: new Date().toISOString(),
      data: { toolName, parameters },
    });
  }
}

export const backendEvents = new BackendEventEmitter();

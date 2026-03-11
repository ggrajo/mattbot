import { createHash } from 'node:crypto';
import { v4 as uuidv4 } from 'uuid';
import type WebSocket from 'ws';
import { createChildLogger } from '../utils/logger.js';
import { twilioToElevenLabs, elevenLabsToTwilio } from '../utils/audio.js';
import { ElevenLabsClient } from '../services/elevenlabs.js';
import type { CallerMemoryContext } from '../services/elevenlabs.js';
import { backendEvents } from '../services/eventEmitter.js';
import { fetchAgentRuntime, buildSystemPrompt, fetchCallerMemory } from '../services/agentRuntime.js';
import type {
  TwilioStreamMessage,
  CallSession,
  TranscriptPart,
} from '../types.js';

const log = createChildLogger('twilioMedia');

/**
 * Manages a single Twilio Media Stream WebSocket session.
 * Bridges audio between Twilio and ElevenLabs Conversational AI.
 */
export class TwilioMediaHandler {
  private readonly ws: WebSocket;
  private readonly sessionId: string;
  private eleven: ElevenLabsClient | null = null;
  private session: CallSession | null = null;
  private closed = false;

  private readonly userId: string;
  private readonly callId: string;

  constructor(ws: WebSocket, userId: string, callId: string) {
    this.ws = ws;
    this.sessionId = uuidv4();
    this.userId = userId;
    this.callId = callId;

    this.ws.on('message', (raw) => this.onTwilioMessage(raw));
    this.ws.on('close', () => this.onTwilioClose());
    this.ws.on('error', (err) => {
      log.error({ err, sessionId: this.sessionId }, 'Twilio WebSocket error');
      this.cleanup();
    });

    log.info({ sessionId: this.sessionId, userId, callId }, 'TwilioMediaHandler created');
  }

  get id(): string {
    return this.sessionId;
  }

  private onTwilioMessage(raw: WebSocket.RawData): void {
    let msg: TwilioStreamMessage;
    try {
      msg = JSON.parse(raw.toString()) as TwilioStreamMessage;
    } catch {
      log.warn({ sessionId: this.sessionId }, 'Non-JSON message from Twilio');
      return;
    }

    switch (msg.event) {
      case 'connected':
        log.info({ sessionId: this.sessionId }, 'Twilio stream connected');
        break;

      case 'start':
        this.handleStart(msg);
        break;

      case 'media':
        this.handleMedia(msg);
        break;

      case 'stop':
        log.info({ sessionId: this.sessionId, streamSid: msg.streamSid }, 'Twilio stream stopped');
        this.cleanup();
        break;
    }
  }

  private async handleStart(msg: Extract<TwilioStreamMessage, { event: 'start' }>): Promise<void> {
    const { streamSid, start } = msg;

    this.session = {
      sessionId: this.sessionId,
      callSid: start.callSid,
      streamSid,
      userId: this.userId,
      callId: this.callId,
      fromNumber: start.customParameters?.from || '',
      toNumber: start.customParameters?.to || '',
      startedAt: new Date(),
      transcriptParts: [],
    };

    log.info(
      { sessionId: this.sessionId, callSid: start.callSid, streamSid },
      'Twilio stream started',
    );

    const runtime = await fetchAgentRuntime(this.callId, this.userId);
    const systemPrompt = buildSystemPrompt(
      runtime,
      this.session.fromNumber,
      this.session.toNumber,
    );

    const callerPhoneHash = createHash('sha256')
      .update(this.session.fromNumber.trim())
      .digest('hex')
      .slice(0, 16);

    let callerMemory: CallerMemoryContext | undefined;
    try {
      callerMemory = await fetchCallerMemory(this.userId, callerPhoneHash);
    } catch (err) {
      log.warn({ err, sessionId: this.sessionId }, 'Failed to fetch caller memory, proceeding without');
    }

    this.eleven = new ElevenLabsClient({
      agentId: runtime.agentId,
      systemPrompt,
      greeting: runtime.greeting,
      voiceId: runtime.voiceId,
      language: runtime.language,
      callerMemory,
    });

    this.eleven.on('audio', (chunk: string) => {
      this.sendAudioToTwilio(chunk);
    });

    this.eleven.on('transcript', (text: string, role: 'user' | 'agent', isFinal: boolean) => {
      this.onTranscript(text, role, isFinal);
    });

    this.eleven.on('tool_call', (toolName: string, params: Record<string, unknown>, toolCallId: string) => {
      this.onToolCall(toolName, params, toolCallId);
    });

    this.eleven.on('end', (conversationId: string) => {
      log.info({ sessionId: this.sessionId, conversationId }, 'ElevenLabs conversation ended');
      this.cleanup();
    });

    this.eleven.on('error', (err: Error) => {
      log.error({ err, sessionId: this.sessionId }, 'ElevenLabs error');
    });

    this.eleven.on('close', () => {
      log.info({ sessionId: this.sessionId }, 'ElevenLabs connection closed');
      if (!this.closed) {
        this.cleanup();
      }
    });

    this.eleven.connect();

    backendEvents.callStarted(
      this.callId,
      start.callSid,
      this.sessionId,
      { fromNumber: this.session.fromNumber, toNumber: this.session.toNumber },
    ).catch(() => {});
  }

  private handleMedia(msg: Extract<TwilioStreamMessage, { event: 'media' }>): void {
    if (!this.eleven?.isConnected) return;
    const pcmBase64 = twilioToElevenLabs(msg.media.payload);
    this.eleven.sendAudio(pcmBase64);
  }

  private sendAudioToTwilio(pcmBase64: string): void {
    if (this.ws.readyState !== this.ws.OPEN || !this.session) return;

    const mulawBase64 = elevenLabsToTwilio(pcmBase64);

    this.ws.send(JSON.stringify({
      event: 'media',
      streamSid: this.session.streamSid,
      media: {
        payload: mulawBase64,
      },
    }));
  }

  private onTranscript(text: string, role: 'user' | 'agent', isFinal: boolean): void {
    if (!this.session) return;

    const part: TranscriptPart = {
      role,
      text,
      timestamp: new Date(),
      isFinal,
    };
    this.session.transcriptParts.push(part);

    if (isFinal) {
      backendEvents.transcriptUpdate(
        this.callId,
        this.session.callSid,
        this.sessionId,
        text,
        role,
        isFinal,
      ).catch(() => {});
    }
  }

  private onToolCall(
    toolName: string,
    parameters: Record<string, unknown>,
    toolCallId: string,
  ): void {
    log.info({ sessionId: this.sessionId, toolName, toolCallId }, 'Tool call received');

    backendEvents.toolCall(
      this.callId,
      this.session?.callSid || '',
      this.sessionId,
      toolName,
      parameters,
    ).catch(() => {});

    if (toolName === 'end_call') {
      this.eleven?.sendToolResult(toolCallId, JSON.stringify({ success: true }));
      setTimeout(() => this.cleanup(), 1000);
      return;
    }

    if (toolName === 'transfer_call') {
      this.eleven?.sendToolResult(toolCallId, JSON.stringify({ success: true, message: 'Transferring now.' }));
      return;
    }

    this.eleven?.sendToolResult(toolCallId, JSON.stringify({ error: 'Unknown tool' }));
  }

  private onTwilioClose(): void {
    log.info({ sessionId: this.sessionId }, 'Twilio WebSocket closed');
    this.cleanup();
  }

  private cleanup(): void {
    if (this.closed) return;
    this.closed = true;

    log.info({ sessionId: this.sessionId }, 'Cleaning up session');

    if (this.eleven) {
      this.eleven.disconnect();
      this.eleven = null;
    }

    if (this.session) {
      backendEvents.callEnded(
        this.callId,
        this.session.callSid,
        this.sessionId,
        {
          transcriptLength: this.session.transcriptParts.length,
          durationSeconds: Math.floor((Date.now() - this.session.startedAt.getTime()) / 1000),
        },
      ).catch(() => {});
    }

    if (this.ws.readyState === this.ws.OPEN) {
      this.ws.close(1000, 'Session ended');
    }
  }
}

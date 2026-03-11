import WebSocket from 'ws';
import { EventEmitter } from 'node:events';
import { config } from '../config.js';
import { createChildLogger } from '../utils/logger.js';
import type { ElevenLabsMessage } from '../types.js';

const log = createChildLogger('elevenlabs');

export interface ElevenLabsClientOptions {
  agentId: string;
  systemPrompt?: string;
  greeting?: string;
  voiceId?: string;
  language?: string;
}

/**
 * Manages a single WebSocket connection to the ElevenLabs Conversational AI API.
 *
 * Events emitted:
 *  - 'audio'       (base64Chunk: string, sampleRate: number)
 *  - 'transcript'  (text: string, role: 'user'|'agent', isFinal: boolean)
 *  - 'tool_call'   (toolName: string, parameters: object, toolCallId: string)
 *  - 'end'         (conversationId: string)
 *  - 'error'       (error: Error)
 *  - 'close'       ()
 */
export class ElevenLabsClient extends EventEmitter {
  private ws: WebSocket | null = null;
  private alive = false;
  private conversationId: string | null = null;
  private readonly options: ElevenLabsClientOptions;

  constructor(options: ElevenLabsClientOptions) {
    super();
    this.options = options;
  }

  get isConnected(): boolean {
    return this.alive && this.ws?.readyState === WebSocket.OPEN;
  }

  connect(): void {
    const agentId = this.options.agentId || config.ELEVENLABS_AGENT_ID;
    if (!agentId) {
      throw new Error('No ElevenLabs agent ID configured');
    }

    const url = new URL(config.ELEVENLABS_WS_URL);
    url.searchParams.set('agent_id', agentId);

    log.info({ url: url.toString() }, 'Connecting to ElevenLabs');

    this.ws = new WebSocket(url.toString(), {
      headers: {
        'xi-api-key': config.ELEVENLABS_API_KEY,
      },
    });

    this.ws.on('open', () => {
      this.alive = true;
      log.info('ElevenLabs WebSocket connected');
      this.sendInitConfig();
    });

    this.ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as ElevenLabsMessage;
        this.handleMessage(msg);
      } catch (err) {
        log.error({ err }, 'Failed to parse ElevenLabs message');
      }
    });

    this.ws.on('close', (code, reason) => {
      this.alive = false;
      log.info({ code, reason: reason.toString() }, 'ElevenLabs WebSocket closed');
      this.emit('close');
    });

    this.ws.on('error', (err) => {
      log.error({ err }, 'ElevenLabs WebSocket error');
      this.emit('error', err);
    });
  }

  private sendInitConfig(): void {
    const initPayload: Record<string, unknown> = {
      type: 'conversation_initiation_client_data',
    };

    const conversationConfig: Record<string, unknown> = {};
    const agentOverrides: Record<string, unknown> = {};

    if (this.options.systemPrompt) {
      agentOverrides.prompt = { prompt: this.options.systemPrompt };
    }
    if (this.options.greeting) {
      agentOverrides.first_message = this.options.greeting;
    }
    if (this.options.voiceId) {
      agentOverrides.tts = { voice_id: this.options.voiceId };
    }
    if (this.options.language) {
      agentOverrides.language = this.options.language;
    }

    if (Object.keys(agentOverrides).length > 0) {
      conversationConfig.agent = agentOverrides;
    }
    if (Object.keys(conversationConfig).length > 0) {
      initPayload.conversation_config_override = conversationConfig;
    }

    this.send(initPayload);
  }

  private handleMessage(msg: ElevenLabsMessage): void {
    switch (msg.type) {
      case 'audio':
        this.emit('audio', msg.audio.chunk, msg.audio.sample_rate);
        break;

      case 'transcript':
        this.emit(
          'transcript',
          msg.transcript.text,
          msg.transcript.role,
          msg.transcript.is_final,
        );
        break;

      case 'tool_call':
        this.emit(
          'tool_call',
          msg.tool_call.tool_name,
          msg.tool_call.parameters,
          msg.tool_call.tool_call_id,
        );
        break;

      case 'conversation_end':
        this.conversationId = msg.conversation_id;
        this.emit('end', msg.conversation_id);
        break;

      case 'error':
        log.error({ error: msg.error }, 'ElevenLabs conversation error');
        this.emit('error', new Error(msg.error.message));
        break;

      case 'ping':
        this.send({ type: 'pong' });
        break;

      default:
        log.debug({ msg }, 'Unhandled ElevenLabs message type');
    }
  }

  /** Send a base64-encoded audio chunk to ElevenLabs. */
  sendAudio(base64Audio: string): void {
    if (!this.isConnected) return;
    this.send({
      user_audio_chunk: base64Audio,
    });
  }

  /** Send a tool call result back to ElevenLabs. */
  sendToolResult(toolCallId: string, result: string): void {
    if (!this.isConnected) return;
    this.send({
      type: 'client_tool_result',
      tool_call_id: toolCallId,
      result,
    });
  }

  /** Send an arbitrary JSON payload. */
  private send(payload: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
    }
  }

  /** Gracefully close the ElevenLabs connection. */
  disconnect(): void {
    this.alive = false;
    if (this.ws) {
      this.ws.close(1000, 'Session ended');
      this.ws = null;
    }
  }

  getConversationId(): string | null {
    return this.conversationId;
  }
}

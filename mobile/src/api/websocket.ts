import { getSecureItem, TOKEN_KEYS } from '../utils/secureStorage';

const WS_BASE_URL = 'ws://localhost:8000/ws/v1';

export type WebSocketEvent =
  | { type: 'call_started'; data: { call_id: string; from_number: string } }
  | { type: 'call_ended'; data: { call_id: string; duration_seconds: number } }
  | { type: 'transcript_update'; data: { call_id: string; text: string; role: string } }
  | { type: 'memory_created'; data: { memory_id: string; content: string; caller_phone_hash?: string } }
  | { type: 'pong' };

type EventHandler = (event: WebSocketEvent) => void;

export class MattBotWebSocket {
  private ws: WebSocket | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<EventHandler>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseDelay = 1000;

  async connect(): Promise<void> {
    const token = await getSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
    if (!token) return;

    const url = `${WS_BASE_URL}/updates?token=${encodeURIComponent(token)}`;

    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data as string) as WebSocketEvent;
        this.listeners.forEach((fn) => fn(parsed));
      } catch {
        // ignore unparseable messages
      }
    };

    this.ws.onclose = () => {
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) return;
    const delay = Math.min(
      this.baseDelay * Math.pow(2, this.reconnectAttempts),
      30000,
    );
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  subscribe(handler: EventHandler): () => void {
    this.listeners.add(handler);
    return () => {
      this.listeners.delete(handler);
    };
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectAttempts = this.maxReconnectAttempts;
    this.ws?.close(1000, 'Client disconnect');
    this.ws = null;
  }
}

export const wsClient = new MattBotWebSocket();

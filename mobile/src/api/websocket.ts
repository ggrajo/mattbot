import { useAuthStore } from '../store/authStore';

type EventHandler = (data: unknown) => void;

const WS_RECONNECT_INITIAL_MS = 1000;
const WS_RECONNECT_MAX_MS = 30000;
const TOKEN_EXPIRED_CODE = 4001;

class RealtimeSocket {
  private static instance: RealtimeSocket;
  private ws: WebSocket | null = null;
  private listeners: Map<string, Set<EventHandler>> = new Map();
  private reconnectDelay = WS_RECONNECT_INITIAL_MS;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private wsUrl: string | null = null;

  static getInstance(): RealtimeSocket {
    if (!RealtimeSocket.instance) {
      RealtimeSocket.instance = new RealtimeSocket();
    }
    return RealtimeSocket.instance;
  }

  connect(wsUrl: string) {
    this.wsUrl = wsUrl;
    this.intentionalClose = false;
    this.doConnect();
  }

  disconnect() {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  on(event: string, handler: EventHandler) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler) {
    this.listeners.get(event)?.delete(handler);
  }

  private async doConnect() {
    if (!this.wsUrl) return;

    const token = useAuthStore.getState().accessToken;
    if (!token) return;

    const url = `${this.wsUrl}?token=${token}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectDelay = WS_RECONNECT_INITIAL_MS;
        this.emit('connected', null);
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          if (parsed.event) {
            this.emit(parsed.event, parsed.data ?? parsed);
          }
        } catch {
          // ignore malformed messages
        }
      };

      this.ws.onclose = (event) => {
        this.emit('disconnected', { code: event.code });

        if (event.code === TOKEN_EXPIRED_CODE) {
          this.handleTokenRefresh();
          return;
        }

        if (!this.intentionalClose) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        // onclose will fire after onerror
      };
    } catch {
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, WS_RECONNECT_MAX_MS);
      this.doConnect();
    }, this.reconnectDelay);
  }

  private async handleTokenRefresh() {
    try {
      const { tryRestoreSession } = useAuthStore.getState();
      await tryRestoreSession();
      this.reconnectDelay = WS_RECONNECT_INITIAL_MS;
      this.doConnect();
    } catch {
      this.scheduleReconnect();
    }
  }

  private emit(event: string, data: unknown) {
    this.listeners.get(event)?.forEach((handler) => {
      try {
        handler(data);
      } catch {
        // don't let listener errors break the socket
      }
    });
  }
}

export const realtimeSocket = RealtimeSocket.getInstance();

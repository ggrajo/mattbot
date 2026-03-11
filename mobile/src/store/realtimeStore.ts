import { create } from 'zustand';

type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

interface RealtimeEvent {
  type: string;
  payload: any;
  timestamp: string;
}

interface RealtimeStore {
  connectionState: ConnectionState;
  lastEvent: RealtimeEvent | null;
  error: string | undefined;
  connect: (accessToken?: string) => void;
  disconnect: () => void;
}

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

function getWsUrl(): string {
  try {
    const Config = require('react-native-config').default;
    return Config?.REALTIME_WS_URL || 'ws://localhost:3001/ws/events';
  } catch {
    return 'ws://localhost:3001/ws/events';
  }
}

async function resolveToken(accessToken?: string): Promise<string | null> {
  if (accessToken) return accessToken;
  try {
    const { getSecureItem, TOKEN_KEYS } = await import('../utils/secureStorage');
    return await getSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
  } catch {
    return null;
  }
}

export const useRealtimeStore = create<RealtimeStore>((set, get) => ({
  connectionState: 'disconnected',
  lastEvent: null,
  error: undefined,

  connect: (accessToken?: string) => {
    if (ws && ws.readyState === WebSocket.OPEN) return;

    set({ connectionState: 'connecting', error: undefined });

    resolveToken(accessToken).then((token) => {
      if (!token) {
        set({ connectionState: 'error', error: 'No access token available' });
        return;
      }

      try {
        const url = `${getWsUrl()}?token=${token}`;
        ws = new WebSocket(url);

        ws.onopen = () => {
          set({ connectionState: 'connected', error: undefined });
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            set({
              lastEvent: {
                type: data.type,
                payload: data.payload || data,
                timestamp: new Date().toISOString(),
              },
            });
          } catch {}
        };

        ws.onerror = () => {
          set({ connectionState: 'error', error: 'WebSocket connection error' });
        };

        ws.onclose = () => {
          set({ connectionState: 'disconnected' });
          ws = null;
          if (reconnectTimer) clearTimeout(reconnectTimer);
          reconnectTimer = setTimeout(() => {
            const state = get();
            if (state.connectionState === 'disconnected') {
              state.connect();
            }
          }, 5000);
        };
      } catch (e: any) {
        set({ connectionState: 'error', error: e?.message || 'Failed to connect' });
      }
    });
  },

  disconnect: () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (ws) {
      ws.onclose = null;
      ws.close();
      ws = null;
    }
    set({ connectionState: 'disconnected', lastEvent: null, error: undefined });
  },
}));

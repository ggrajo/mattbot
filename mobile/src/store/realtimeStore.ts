import { create } from 'zustand';
import { getSecureItem, TOKEN_KEYS } from '../utils/secureStorage';
import { API_BASE_URL } from '../api/client';

interface TranscriptTurn {
  role: 'user' | 'agent';
  text: string;
  ts: string;
}

interface LiveTranscript {
  callId: string;
  turns: TranscriptTurn[];
  ended: boolean;
}

interface RealtimeStore {
  connected: boolean;
  activeCallId: string | null;
  liveTranscript: LiveTranscript | null;

  connect: () => Promise<void>;
  disconnect: () => void;
  clearLiveTranscript: () => void;
}

let ws: WebSocket | null = null;

export const useRealtimeStore = create<RealtimeStore>((set, get) => ({
  connected: false,
  activeCallId: null,
  liveTranscript: null,

  connect: async () => {
    if (ws) return;

    const token = await getSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
    if (!token) return;

    const base = API_BASE_URL.replace(/\/api\/v1\/?$/, '');
    const wsBase = base.replace(/^http/, 'ws');
    const wsUrl = `${wsBase}/ws/events`;
    ws = new WebSocket(`${wsUrl}?token=${token}`);

    ws.onopen = () => {
      set({ connected: true });
    };

    ws.onclose = () => {
      ws = null;
      set({ connected: false });
    };

    ws.onerror = () => {
      ws?.close();
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const type = msg.event_type ?? msg.type;

        switch (type) {
          case 'CALL_STARTED':
            set({ activeCallId: msg.call_id ?? msg.callId });
            break;

          case 'CALL_ENDED':
            set((state) => {
              const lt = state.liveTranscript;
              return {
                activeCallId: null,
                liveTranscript: lt ? { ...lt, ended: true } : null,
              };
            });
            break;

          case 'LIVE_TRANSCRIPT': {
            const callId = msg.call_id ?? msg.callId;
            const turn: TranscriptTurn = {
              role: msg.role,
              text: msg.text,
              ts: msg.ts ?? new Date().toISOString(),
            };
            set((state) => {
              const lt = state.liveTranscript;
              if (lt && lt.callId === callId) {
                return { liveTranscript: { ...lt, turns: [...lt.turns, turn] } };
              }
              return {
                liveTranscript: { callId, turns: [turn], ended: false },
              };
            });
            break;
          }

          case 'TRANSCRIPT_READY':
            break;

          default:
            break;
        }
      } catch {
        // ignore malformed messages
      }
    };
  },

  disconnect: () => {
    ws?.close();
    ws = null;
    set({ connected: false, activeCallId: null, liveTranscript: null });
  },

  clearLiveTranscript: () => {
    set({ liveTranscript: null });
  },
}));

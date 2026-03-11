import { create } from 'zustand';

interface RealtimeState {
  activeCallId: string | null;
  isCallActive: boolean;
  transcript: string[];
  setActiveCall: (callId: string) => void;
  clearActiveCall: () => void;
  addTranscriptLine: (line: string) => void;
}

export const useRealtimeStore = create<RealtimeState>((set) => ({
  activeCallId: null,
  isCallActive: false,
  transcript: [],
  setActiveCall: (callId) => set({ activeCallId: callId, isCallActive: true, transcript: [] }),
  clearActiveCall: () => set({ activeCallId: null, isCallActive: false, transcript: [] }),
  addTranscriptLine: (line) => set((s) => ({ transcript: [...s.transcript, line] })),
}));

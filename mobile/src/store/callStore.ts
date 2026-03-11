import { create } from 'zustand';
import { callsApi, CallResponse, CallEventResponse } from '../api/calls';
import { extractApiError } from '../api/client';

interface CallStore {
  calls: CallResponse[];
  total: number;
  selectedCall: CallResponse | null;
  events: CallEventResponse[];
  loading: boolean;
  error: string | null;

  fetchCalls: (params?: { status?: string; limit?: number; offset?: number }) => Promise<void>;
  fetchCall: (callId: string) => Promise<void>;
  fetchCallEvents: (callId: string) => Promise<void>;
  clearSelected: () => void;
}

export const useCallStore = create<CallStore>((set) => ({
  calls: [],
  total: 0,
  selectedCall: null,
  events: [],
  loading: false,
  error: null,

  fetchCalls: async (params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await callsApi.listCalls(params);
      set({ calls: data.calls, total: data.total, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  fetchCall: async (callId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await callsApi.getCall(callId);
      set({ selectedCall: data, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  fetchCallEvents: async (callId) => {
    set({ loading: true, error: null });
    try {
      const { data } = await callsApi.getCallEvents(callId);
      set({ events: data, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  clearSelected: () => set({ selectedCall: null, events: [] }),
}));

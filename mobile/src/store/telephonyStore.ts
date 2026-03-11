import { create } from 'zustand';
import { telephonyApi, UserNumber, CallModeConfig } from '../api/telephony';
import { extractApiError } from '../api/client';

interface TelephonyStore {
  numbers: UserNumber[];
  callMode: CallModeConfig | null;
  loading: boolean;
  error: string | null;

  fetchNumbers: () => Promise<void>;
  provisionNumber: () => Promise<void>;
  fetchCallMode: () => Promise<void>;
  updateCallMode: (mode: string, forwardingNumber?: string) => Promise<void>;
}

export const useTelephonyStore = create<TelephonyStore>((set) => ({
  numbers: [],
  callMode: null,
  loading: false,
  error: null,

  fetchNumbers: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await telephonyApi.getNumbers();
      const items = Array.isArray(data) ? data : (data as any)?.items ?? [];
      set({ numbers: items, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  provisionNumber: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await telephonyApi.provisionNumber();
      set((state) => ({
        numbers: [...state.numbers, data],
        loading: false,
      }));
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  fetchCallMode: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await telephonyApi.getCallMode();
      set({ callMode: data, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  updateCallMode: async (mode, forwardingNumber) => {
    set({ loading: true, error: null });
    try {
      const { data } = await telephonyApi.updateCallMode(mode, forwardingNumber);
      set({ callMode: data, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },
}));

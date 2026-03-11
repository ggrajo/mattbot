import { create } from 'zustand';

export interface UserNumber {
  id: string;
  phone_number: string;
  friendly_name: string | null;
  status: string;
}

interface TelephonyStore {
  numbers: UserNumber[];
  error: string | undefined;
  loadNumbers: () => Promise<void>;
  reset: () => void;
}

export const useTelephonyStore = create<TelephonyStore>((set) => ({
  numbers: [],
  error: undefined,

  loadNumbers: async () => {
    try {
      const { apiClient } = await import('../api/client');
      const { data } = await apiClient.get('/numbers');
      set({ numbers: data?.numbers ?? data ?? [], error: undefined });
    } catch {
      set({ numbers: [], error: undefined });
    }
  },

  reset: () => {
    set({ numbers: [], error: undefined });
  },
}));

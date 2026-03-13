import { create } from 'zustand';
import {
  type SpamEntry,
  type AddSpamParams,
  listSpam as apiListSpam,
  addSpam as apiAddSpam,
  deleteSpam as apiDeleteSpam,
} from '../api/spam';
import { extractApiError } from '../api/client';

interface SpamStore {
  items: SpamEntry[];
  loading: boolean;
  error: string | null;

  loadSpam: () => Promise<void>;
  addSpam: (params: AddSpamParams) => Promise<boolean>;
  removeSpam: (spamId: string) => Promise<boolean>;
  reset: () => void;
}

export const useSpamStore = create<SpamStore>((set) => ({
  items: [],
  loading: false,
  error: null,

  loadSpam: async () => {
    set({ loading: true, error: null });
    try {
      const result = await apiListSpam();
      set({ items: result.items, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  addSpam: async (params) => {
    set({ error: null });
    try {
      const entry = await apiAddSpam(params);
      set((state) => ({ items: [entry, ...state.items] }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  removeSpam: async (spamId) => {
    set({ error: null });
    try {
      await apiDeleteSpam(spamId);
      set((state) => ({ items: state.items.filter((i) => i.id !== spamId) }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () => set({ items: [], loading: false, error: null }),
}));

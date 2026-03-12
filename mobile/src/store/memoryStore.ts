import { create } from 'zustand';
import {
  type MemoryItem,
  listMemoryItems as apiListMemory,
  createMemoryItem as apiCreateMemory,
  updateMemoryItem as apiUpdateMemory,
  deleteMemoryItem as apiDeleteMemory,
  deleteAllMemory as apiDeleteAll,
  type CreateMemoryParams,
  type UpdateMemoryParams,
} from '../api/memory';
import { extractApiError } from '../api/client';

interface MemoryStore {
  items: MemoryItem[];
  loading: boolean;
  error: string | null;

  loadMemory: (callerPhoneHash?: string) => Promise<void>;
  createItem: (params: CreateMemoryParams) => Promise<boolean>;
  updateItem: (id: string, params: UpdateMemoryParams) => Promise<boolean>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteAll: () => Promise<boolean>;
  reset: () => void;
}

export const useMemoryStore = create<MemoryStore>((set) => ({
  items: [],
  loading: false,
  error: null,

  loadMemory: async (callerPhoneHash) => {
    set({ loading: true, error: null });
    try {
      const result = await apiListMemory(callerPhoneHash);
      set({ items: result.items ?? [], loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  createItem: async (params) => {
    try {
      const item = await apiCreateMemory(params);
      set((s) => ({ items: [item, ...s.items] }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  updateItem: async (id, params) => {
    try {
      const updated = await apiUpdateMemory(id, params);
      set((s) => ({ items: s.items.map((i) => (i.id === id ? updated : i)) }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  deleteItem: async (id) => {
    try {
      await apiDeleteMemory(id);
      set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  deleteAll: async () => {
    try {
      await apiDeleteAll();
      set({ items: [] });
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () => set({ items: [], loading: false, error: null }),
}));

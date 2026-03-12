import { create } from 'zustand';
import {
  type VipEntry,
  type AddVipParams,
  listVip as apiListVip,
  addVip as apiAddVip,
  removeVip as apiRemoveVip,
} from '../api/vip';
import { extractApiError } from '../api/client';

interface VipStore {
  items: VipEntry[];
  loading: boolean;
  error: string | null;

  loadVip: () => Promise<void>;
  addVip: (params: AddVipParams) => Promise<boolean>;
  removeVip: (vipId: string) => Promise<boolean>;
  reset: () => void;
}

export const useVipStore = create<VipStore>((set) => ({
  items: [],
  loading: false,
  error: null,

  loadVip: async () => {
    set({ loading: true, error: null });
    try {
      const result = await apiListVip();
      set({ items: result.items, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  addVip: async (params) => {
    set({ error: null });
    try {
      const entry = await apiAddVip(params);
      set((state) => ({ items: [entry, ...state.items] }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  removeVip: async (vipId) => {
    set({ error: null });
    try {
      await apiRemoveVip(vipId);
      set((state) => ({ items: state.items.filter((i) => i.id !== vipId) }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () => set({ items: [], loading: false, error: null }),
}));

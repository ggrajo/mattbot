import { create } from 'zustand';
import { statsApi, UserStats } from '../api/stats';

interface StatsStore extends UserStats {
  loading: boolean;
  fetchStats: () => Promise<void>;
}

export const useStatsStore = create<StatsStore>((set) => ({
  total_calls: 0,
  minutes_used: 0,
  memory_items: 0,
  loading: false,
  fetchStats: async () => {
    set({ loading: true });
    try {
      const { data } = await statsApi.getStats();
      set({ ...data, loading: false });
    } catch {
      set({ loading: false });
    }
  },
}));

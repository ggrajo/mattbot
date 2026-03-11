import { create } from 'zustand';

export interface CallStats {
  total_calls: number;
  completed_calls: number;
  vip_calls: number;
  unique_callers: number;
  spam_blocked: number;
  avg_duration_seconds: number;
}

interface StatsStore {
  stats: CallStats | null;
  loading: boolean;
  error: string | undefined;
  loadStats: () => Promise<void>;
}

export const useStatsStore = create<StatsStore>((set) => ({
  stats: null,
  loading: false,
  error: undefined,

  loadStats: async () => {
    set({ loading: true });
    try {
      const { apiClient } = await import('../api/client');
      const { data } = await apiClient.get('/stats/calls');
      set({ stats: data, loading: false, error: undefined });
    } catch {
      set({ stats: null, loading: false, error: undefined });
    }
  },
}));

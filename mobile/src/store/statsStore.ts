import { create } from 'zustand';
import { apiClient, extractApiError } from '../api/client';

export interface DashboardStats {
  total_calls: number;
  completed_calls: number;
  unique_callers: number;
  spam_blocked: number;
  avg_duration_seconds: number | null;
  vip_calls: number;
  calls_this_week: number;
  calls_last_week: number;
  calls_today: number;
  appointments_booked: number;
  longest_call_seconds: number | null;
  total_talk_minutes: number;
}

interface StatsStore {
  stats: DashboardStats | null;
  loading: boolean;
  error: string | null;

  loadStats: () => Promise<void>;
  refreshStats: () => Promise<void>;
  reset: () => void;
}

export const useStatsStore = create<StatsStore>((set) => ({
  stats: null,
  loading: false,
  error: null,

  loadStats: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await apiClient.get<DashboardStats>('/stats');
      set({ stats: data, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  refreshStats: async () => {
    try {
      const { data } = await apiClient.get<DashboardStats>('/stats');
      set({ stats: data });
    } catch {
      // silent refresh
    }
  },

  reset: () => set({ stats: null, loading: false, error: null }),
}));

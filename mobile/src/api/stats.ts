import { apiClient } from './client';

export interface DashboardStats {
  total_calls: number;
  completed_calls: number;
  unique_callers: number;
  spam_blocked: number;
  avg_duration_seconds: number | null;
  vip_calls: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get('/stats');
  return data;
}

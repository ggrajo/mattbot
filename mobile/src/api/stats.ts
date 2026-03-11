import { apiClient } from './client';

export interface UserStats {
  total_calls: number;
  minutes_used: number;
  memory_items: number;
}

export const statsApi = {
  getStats: () => apiClient.get<UserStats>('/stats'),
};

import { apiClient } from './client';

export interface Agent {
  id: string;
  name: string;
  system_prompt: string;
  greeting_message: string;
  voice_id: string | null;
  language: string;
  personality: string;
  is_active: boolean;
}

export const agentsApi = {
  list: () => apiClient.get<Agent[]>('/agents'),
  get: (agentId: string) => apiClient.get<Agent>(`/agents/${agentId}`),
  create: (data: Partial<Agent>) => apiClient.post<Agent>('/agents', data),
  update: (agentId: string, data: Partial<Agent>) => apiClient.put<Agent>(`/agents/${agentId}`, data),
  setDefault: (agentId: string) => apiClient.post(`/agents/${agentId}/default`),
};

import { apiClient } from './client';

export interface MemoryItem {
  id: string;
  user_id: string;
  content: string;
  memory_type: string;
  source: string;
  call_id: string | null;
  caller_phone_hash: string | null;
  caller_name: string | null;
  importance: number;
  expires_at: string | null;
  created_at: string;
}

export interface MemoryListResponse {
  items: MemoryItem[];
  total: number;
}

export interface CallerProfile {
  phone_hash: string;
  caller_name: string | null;
  memory_count: number;
  call_count: number;
  last_seen: string | null;
}

export interface CallerDetailResponse {
  phone_hash: string;
  caller_name: string | null;
  memories: MemoryItem[];
  call_count: number;
  last_seen: string | null;
}

export interface CallerListResponse {
  callers: CallerProfile[];
  total: number;
}

export interface CreateMemoryPayload {
  content: string;
  memory_type?: string;
  source?: string;
  call_id?: string;
  caller_phone_hash?: string;
  caller_name?: string;
  importance?: number;
}

export const memoryApi = {
  listMemories: (params?: {
    call_id?: string;
    memory_type?: string;
    limit?: number;
    offset?: number;
  }) => apiClient.get<MemoryListResponse>('/memory', { params }),

  searchMemories: (q: string, params?: { limit?: number; offset?: number }) =>
    apiClient.get<MemoryListResponse>('/memory/search', {
      params: { q, ...params },
    }),

  getCallerMemories: (
    phoneHash: string,
    params?: { limit?: number; offset?: number },
  ) => apiClient.get<MemoryListResponse>(`/memory/caller/${phoneHash}`, { params }),

  createMemory: (data: CreateMemoryPayload) =>
    apiClient.post<MemoryItem>('/memory', data),

  deleteMemory: (memoryId: string) =>
    apiClient.delete(`/memory/${memoryId}`),

  listCallers: (params?: { limit?: number; offset?: number }) =>
    apiClient.get<CallerListResponse>('/callers', { params }),

  getCallerProfile: (phoneHash: string) =>
    apiClient.get<CallerDetailResponse>(`/callers/${phoneHash}`),

  updateCallerName: (phoneHash: string, name: string) =>
    apiClient.put(`/callers/${phoneHash}/name`, { name }),
};

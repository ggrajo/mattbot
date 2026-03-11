import { apiClient } from './client';

export interface MemoryItem {
  id: string;
  memory_type: string;
  subject: string | null;
  value: string | null;
  confidence: number | null;
  user_confirmed: boolean;
  source_call_id: string | null;
  created_at: string;
}

export interface CallerProfile {
  caller_phone_hash: string;
  display_name: string | null;
  relationship: string | null;
  total_calls: number;
}

export interface CallerDetailResponse {
  profile: CallerProfile;
  memories: MemoryItem[];
}

async function fetchCallerMemory(phoneHash: string): Promise<CallerDetailResponse> {
  const { data } = await apiClient.get(`/memory/caller/${phoneHash}`);
  return data;
}

async function createMemory(params: {
  memory_type: string;
  subject?: string;
  value?: string;
  caller_phone_hash?: string;
}): Promise<MemoryItem> {
  const { data } = await apiClient.post('/memory', params);
  return data;
}

async function confirmMemory(id: string): Promise<MemoryItem> {
  const { data } = await apiClient.post(`/memory/${id}/confirm`);
  return data;
}

async function rejectMemory(id: string): Promise<void> {
  await apiClient.post(`/memory/${id}/reject`);
}

async function fetchCallerProfile(phoneHash: string): Promise<CallerProfile> {
  const { data } = await apiClient.get(`/memory/caller/${phoneHash}/profile`);
  return data;
}

export const memoryApi = {
  fetchCallerMemory,
  createMemory,
  confirmMemory,
  rejectMemory,
  fetchCallerProfile,
};

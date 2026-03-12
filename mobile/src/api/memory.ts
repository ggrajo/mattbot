import { apiClient } from './client';
import { type MemoryItem } from './calls';

export interface CreateMemoryParams {
  memory_type: string;
  subject?: string;
  value?: string;
  source_call_id?: string;
}

export interface UpdateMemoryParams {
  subject?: string;
  value?: string;
  user_confirmed?: boolean;
}

export async function listMemoryItems(
  callerPhoneHash?: string,
): Promise<{ items: MemoryItem[] }> {
  const params: Record<string, string> = {};
  if (callerPhoneHash) params.caller_phone_hash = callerPhoneHash;
  const { data } = await apiClient.get('/memory', { params });
  return data;
}

export async function createMemoryItem(
  params: CreateMemoryParams,
): Promise<MemoryItem> {
  const { data } = await apiClient.post('/memory', params);
  return data;
}

export async function updateMemoryItem(
  memoryId: string,
  params: UpdateMemoryParams,
): Promise<MemoryItem> {
  const { data } = await apiClient.patch(`/memory/${memoryId}`, params);
  return data;
}

export async function deleteMemoryItem(memoryId: string): Promise<void> {
  await apiClient.delete(`/memory/${memoryId}`);
}

export async function deleteAllMemory(): Promise<void> {
  await apiClient.delete('/memory');
}

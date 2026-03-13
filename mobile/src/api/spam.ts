import { apiClient } from './client';

export interface SpamEntry {
  id: string;
  phone_last4: string;
  spam_score: number;
  spam_call_count: number;
  first_flagged_at: string;
  last_flagged_at: string;
  auto_blocked: boolean;
  source: string;
}

export interface AddSpamParams {
  phone_number: string;
  reason?: string;
}

export async function listSpam(): Promise<{ items: SpamEntry[] }> {
  const { data } = await apiClient.get('/spam');
  return data;
}

export async function addSpam(params: AddSpamParams): Promise<SpamEntry> {
  const { data } = await apiClient.post('/spam', params);
  return data;
}

export async function deleteSpam(spamId: string): Promise<void> {
  await apiClient.delete(`/spam/${spamId}`);
}

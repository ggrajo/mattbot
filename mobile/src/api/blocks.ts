import { apiClient } from './client';

export interface BlockEntry {
  id: string;
  phone_last4: string;
  display_name: string | null;
  reason: string | null;
  company: string | null;
  relationship: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface AddBlockParams {
  phone_number: string;
  display_name?: string;
  reason?: string;
  company?: string;
  relationship?: string;
  email?: string;
  notes?: string;
}

export async function listBlocks(): Promise<{ items: BlockEntry[] }> {
  const { data } = await apiClient.get('/blocks');
  return data;
}

export async function addBlock(params: AddBlockParams): Promise<BlockEntry> {
  const { data } = await apiClient.post('/blocks', params);
  return data;
}

export async function removeBlock(blockId: string): Promise<void> {
  await apiClient.delete(`/blocks/${blockId}`);
}

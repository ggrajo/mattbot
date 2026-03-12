import { apiClient } from './client';

export interface VipEntry {
  id: string;
  phone_last4: string;
  display_name: string | null;
  company: string | null;
  relationship: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface AddVipParams {
  phone_number: string;
  display_name?: string;
  company?: string;
  relationship?: string;
  email?: string;
  notes?: string;
}

export async function listVip(): Promise<{ items: VipEntry[] }> {
  const { data } = await apiClient.get('/vip');
  return data;
}

export async function addVip(params: AddVipParams): Promise<VipEntry> {
  const { data } = await apiClient.post('/vip', params);
  return data;
}

export async function removeVip(vipId: string): Promise<void> {
  await apiClient.delete(`/vip/${vipId}`);
}

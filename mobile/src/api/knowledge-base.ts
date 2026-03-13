import { Platform } from 'react-native';
import { apiClient } from './client';

export interface KBDoc {
  id: string;
  name: string;
  source_type: 'text' | 'url' | 'file';
  source_ref: string | null;
  created_at: string;
}

export interface KBDocList {
  items: KBDoc[];
  total: number;
}

export async function listKBDocs(): Promise<KBDocList> {
  const { data } = await apiClient.get('/knowledge-base');
  return data;
}

export async function createKBFromText(name: string, text: string): Promise<KBDoc> {
  const { data } = await apiClient.post('/knowledge-base/text', { name, text });
  return data;
}

export async function createKBFromUrl(name: string, url: string): Promise<KBDoc> {
  const { data } = await apiClient.post('/knowledge-base/url', { name, url });
  return data;
}

export async function createKBFromFile(
  name: string,
  fileUri: string,
  fileName: string,
): Promise<KBDoc> {
  const formData = new FormData();
  formData.append('name', name);
  formData.append('file', {
    uri: Platform.OS === 'android' ? fileUri : fileUri.replace('file://', ''),
    name: fileName,
    type: 'application/octet-stream',
  } as any);
  const { data } = await apiClient.post('/knowledge-base/file', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function deleteKBDoc(docId: string): Promise<{ deleted: boolean }> {
  const { data } = await apiClient.delete(`/knowledge-base/${docId}`);
  return data;
}

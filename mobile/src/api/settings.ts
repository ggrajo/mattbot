import { apiClient } from './client';

export interface VoiceCatalogEntry {
  id: string;
  voice_id: string;
  name: string;
  provider: string;
  gender: string | null;
  accent: string | null;
  preview_url: string | null;
  locale: string;
  is_active: boolean;
}

export interface VoiceListResponse {
  voices: VoiceCatalogEntry[];
  total: number;
}

export interface VoicePreviewResponse {
  preview_url: string;
}

export const settingsApi = {
  listVoices: (params?: { gender?: string; locale?: string }) =>
    apiClient.get<VoiceListResponse>('/voices', { params }),

  getVoice: (voiceId: string) =>
    apiClient.get<VoiceCatalogEntry>(`/voices/${voiceId}`),

  getVoicePreview: (voiceId: string) =>
    apiClient.get<VoicePreviewResponse>(`/voices/preview/${voiceId}`),

  updateTemperament: (agentId: string, personality: string) =>
    apiClient.put(`/agents/${agentId}`, { personality }),

  updateBusinessHours: (agentId: string, hours: Record<string, { open: string; close: string; enabled: boolean }>) =>
    apiClient.put(`/agents/${agentId}`, { business_hours: hours }),
};

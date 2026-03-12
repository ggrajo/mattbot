import { create } from 'zustand';
import { apiClient, extractApiError } from '../api/client';

export interface TextBackTemplate {
  id: string;
  category: string;
  title: string;
  body: string;
  tone_tag: string;
}

export interface TextBackAction {
  id: string;
  call_id: string | null;
  status: string;
  to_number_last4: string;
  draft_body: string | null;
  final_body: string | null;
  template_id_used: string | null;
  approved_at: string | null;
  last_error_code: string | null;
  created_at: string;
}

interface MessageStore {
  templates: TextBackTemplate[];
  drafts: TextBackAction[];
  loading: boolean;
  error: string | null;

  loadTemplates: () => Promise<void>;
  createDraft: (
    callId: string,
    templateId?: string,
    customBody?: string,
    toNumber?: string,
  ) => Promise<TextBackAction | null>;
  updateDraft: (
    actionId: string,
    body?: string,
    toNumber?: string,
  ) => Promise<boolean>;
  approveSend: (
    actionId: string,
    finalBody: string,
    toNumber: string,
    idempotencyKey: string,
    deviceId: string,
  ) => Promise<boolean>;
  retrySend: (actionId: string) => Promise<boolean>;
  cancelDraft: (actionId: string) => Promise<boolean>;
  reset: () => void;
}

export const useMessageStore = create<MessageStore>((set) => ({
  templates: [],
  drafts: [],
  loading: false,
  error: null,

  loadTemplates: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await apiClient.get<{ items: TextBackTemplate[] }>(
        '/messages/templates/text-back',
      );
      set({ templates: data.items, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  createDraft: async (callId, templateId, customBody, toNumber) => {
    set({ error: null });
    try {
      const { data } = await apiClient.post<TextBackAction>(
        `/messages/calls/${callId}/text-back/draft`,
        { template_id: templateId, custom_body: customBody, to_number: toNumber },
      );
      set((state) => ({ drafts: [data, ...state.drafts] }));
      return data;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return null;
    }
  },

  updateDraft: async (actionId, body, toNumber) => {
    set({ error: null });
    try {
      const { data } = await apiClient.patch<TextBackAction>(
        `/messages/actions/${actionId}/text-back`,
        { body, to_number: toNumber },
      );
      set((state) => ({
        drafts: state.drafts.map((d) => (d.id === actionId ? data : d)),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  approveSend: async (actionId, finalBody, toNumber, idempotencyKey, deviceId) => {
    set({ error: null });
    try {
      const { data } = await apiClient.post<TextBackAction>(
        `/messages/actions/${actionId}/approve`,
        {
          final_body: finalBody,
          to_number: toNumber,
          idempotency_key: idempotencyKey,
          device_id: deviceId,
        },
      );
      set((state) => ({
        drafts: state.drafts.map((d) => (d.id === actionId ? data : d)),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  retrySend: async (actionId) => {
    set({ error: null });
    try {
      const { data } = await apiClient.post<TextBackAction>(
        `/messages/actions/${actionId}/retry`,
      );
      set((state) => ({
        drafts: state.drafts.map((d) => (d.id === actionId ? data : d)),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  cancelDraft: async (actionId) => {
    set({ error: null });
    try {
      await apiClient.post(`/messages/actions/${actionId}/cancel`);
      set((state) => ({
        drafts: state.drafts.filter((d) => d.id !== actionId),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () => set({ templates: [], drafts: [], loading: false, error: null }),
}));

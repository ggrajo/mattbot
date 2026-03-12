import { create } from 'zustand';
import {
  type CallListItem,
  type CallDetail,
  type CallArtifacts,
  type TranscriptResponse,
  type CallFilters,
  fetchCalls as apiFetchCalls,
  fetchCallDetail as apiFetchDetail,
  fetchCallArtifacts as apiFetchArtifacts,
  fetchCallTranscript as apiFetchTranscript,
  retryCallTranscript as apiRetryTranscript,
} from '../api/calls';
import { extractApiError } from '../api/client';

interface CallStore {
  calls: CallListItem[];
  selectedCall: CallDetail | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  artifacts: CallArtifacts | null;
  transcript: TranscriptResponse | null;
  artifactsLoading: boolean;
  transcriptLoading: boolean;

  loadCalls: (filters?: CallFilters) => Promise<void>;
  loadMore: (filters?: CallFilters) => Promise<void>;
  loadCallDetail: (callId: string) => Promise<void>;
  loadArtifacts: (callId: string) => Promise<void>;
  loadTranscript: (callId: string) => Promise<void>;
  retryTranscript: (callId: string) => Promise<boolean>;
  reset: () => void;
}

export const useCallStore = create<CallStore>((set, get) => ({
  calls: [],
  selectedCall: null,
  loading: false,
  loadingMore: false,
  error: null,
  nextCursor: null,
  hasMore: false,
  artifacts: null,
  transcript: null,
  artifactsLoading: false,
  transcriptLoading: false,

  loadCalls: async (filters) => {
    set({ loading: true, error: null });
    try {
      const result = await apiFetchCalls(undefined, filters);
      set({
        calls: result.items,
        nextCursor: result.next_cursor,
        hasMore: result.has_more,
        loading: false,
      });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  loadMore: async (filters) => {
    const { nextCursor, hasMore } = get();
    if (!hasMore || !nextCursor) return;
    set({ loadingMore: true, error: null });
    try {
      const result = await apiFetchCalls(nextCursor, filters);
      set((state) => ({
        calls: [...state.calls, ...result.items],
        nextCursor: result.next_cursor,
        hasMore: result.has_more,
        loadingMore: false,
      }));
    } catch (e: unknown) {
      set({ error: extractApiError(e), loadingMore: false });
    }
  },

  loadCallDetail: async (callId) => {
    set({ loading: true, error: null, selectedCall: null });
    try {
      const detail = await apiFetchDetail(callId);
      set({ selectedCall: detail, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  loadArtifacts: async (callId) => {
    set({ artifactsLoading: true, artifacts: null });
    try {
      const artifacts = await apiFetchArtifacts(callId);
      set({ artifacts, artifactsLoading: false });
    } catch {
      set({ artifactsLoading: false });
    }
  },

  loadTranscript: async (callId) => {
    set({ transcriptLoading: true, transcript: null });
    try {
      const transcript = await apiFetchTranscript(callId);
      set({ transcript, transcriptLoading: false });
    } catch {
      set({ transcriptLoading: false });
    }
  },

  retryTranscript: async (callId) => {
    try {
      await apiRetryTranscript(callId);
      return true;
    } catch {
      return false;
    }
  },

  reset: () =>
    set({
      calls: [],
      selectedCall: null,
      loading: false,
      loadingMore: false,
      error: null,
      nextCursor: null,
      hasMore: false,
      artifacts: null,
      transcript: null,
      artifactsLoading: false,
      transcriptLoading: false,
    }),
}));

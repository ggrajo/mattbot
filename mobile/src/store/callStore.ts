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
  detailLoading: boolean;
  loadingMore: boolean;
  error: string | null;
  detailError: string | null;
  nextCursor: string | null;
  hasMore: boolean;
  artifacts: CallArtifacts | null;
  transcript: TranscriptResponse | null;
  artifactsLoading: boolean;
  transcriptLoading: boolean;
  artifactsError: string | null;
  transcriptError: string | null;

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
  detailLoading: false,
  loadingMore: false,
  error: null,
  detailError: null,
  nextCursor: null,
  hasMore: false,
  artifacts: null,
  transcript: null,
  artifactsLoading: false,
  transcriptLoading: false,
  artifactsError: null,
  transcriptError: null,

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
    set({ detailLoading: true, detailError: null, selectedCall: null });
    try {
      const detail = await apiFetchDetail(callId);
      set({ selectedCall: detail, detailLoading: false });
    } catch (e: unknown) {
      set({ detailError: extractApiError(e), detailLoading: false });
    }
  },

  loadArtifacts: async (callId) => {
    set({ artifactsLoading: true, artifacts: null, artifactsError: null });
    try {
      const artifacts = await apiFetchArtifacts(callId);
      set({ artifacts, artifactsLoading: false });
    } catch (e: unknown) {
      set({ artifactsError: extractApiError(e), artifactsLoading: false });
    }
  },

  loadTranscript: async (callId) => {
    set({ transcriptLoading: true, transcript: null, transcriptError: null });
    try {
      const transcript = await apiFetchTranscript(callId);
      set({ transcript, transcriptLoading: false });
    } catch (e: unknown) {
      set({ transcriptError: extractApiError(e), transcriptLoading: false });
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
      detailLoading: false,
      loadingMore: false,
      error: null,
      detailError: null,
      nextCursor: null,
      hasMore: false,
      artifacts: null,
      transcript: null,
      artifactsLoading: false,
      transcriptLoading: false,
      artifactsError: null,
      transcriptError: null,
    }),
}));

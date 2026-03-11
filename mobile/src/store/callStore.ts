import { create } from 'zustand';
import {
  type CallListItem,
  type CallDetail,
  type CallArtifacts,
  type TranscriptResponse,
  fetchCalls as apiFetchCalls,
  fetchCallDetail as apiFetchCallDetail,
  fetchCallArtifacts as apiFetchArtifacts,
  fetchCallTranscript as apiFetchTranscript,
  retryCallTranscript as apiRetryTranscript,
} from '../api/calls';
import { extractApiError } from '../api/client';

interface CallStore {
  calls: CallListItem[];
  selectedCall: CallDetail | null;
  artifacts: CallArtifacts | null;
  transcript: TranscriptResponse | null;
  loading: boolean;
  loadingMore: boolean;
  artifactsLoading: boolean;
  transcriptLoading: boolean;
  error: string | null;
  nextCursor: string | null;
  hasMore: boolean;

  loadCalls: () => Promise<void>;
  loadMore: () => Promise<void>;
  loadCallDetail: (id: string) => Promise<void>;
  loadArtifacts: (callId: string) => Promise<void>;
  loadTranscript: (callId: string) => Promise<void>;
  retryTranscript: (callId: string) => Promise<void>;
  reset: () => void;
}

export const useCallStore = create<CallStore>((set, get) => ({
  calls: [],
  selectedCall: null,
  artifacts: null,
  transcript: null,
  loading: false,
  loadingMore: false,
  artifactsLoading: false,
  transcriptLoading: false,
  error: null,
  nextCursor: null,
  hasMore: false,

  loadCalls: async () => {
    set({ loading: true, error: null });
    try {
      const result = await apiFetchCalls();
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

  loadMore: async () => {
    const { nextCursor, hasMore, loadingMore } = get();
    if (!hasMore || loadingMore || !nextCursor) return;

    set({ loadingMore: true });
    try {
      const result = await apiFetchCalls(nextCursor);
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

  loadCallDetail: async (id: string) => {
    set({ loading: true, error: null, selectedCall: null, artifacts: null, transcript: null });
    try {
      const detail = await apiFetchCallDetail(id);
      set({ selectedCall: detail, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  loadArtifacts: async (callId: string) => {
    set({ artifactsLoading: true });
    try {
      const data = await apiFetchArtifacts(callId);
      set({ artifacts: data, artifactsLoading: false });
    } catch (e: unknown) {
      set({ artifactsLoading: false, error: extractApiError(e) });
    }
  },

  loadTranscript: async (callId: string) => {
    set({ transcriptLoading: true });
    try {
      const data = await apiFetchTranscript(callId);
      set({ transcript: data, transcriptLoading: false });
    } catch (e: unknown) {
      set({ transcriptLoading: false, error: extractApiError(e) });
    }
  },

  retryTranscript: async (callId: string) => {
    try {
      await apiRetryTranscript(callId);
      set((state) => ({
        transcript: state.transcript
          ? { ...state.transcript, status: 'processing' }
          : null,
      }));
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
    }
  },

  reset: () => {
    set({
      calls: [],
      selectedCall: null,
      artifacts: null,
      transcript: null,
      loading: false,
      loadingMore: false,
      artifactsLoading: false,
      transcriptLoading: false,
      error: null,
      nextCursor: null,
      hasMore: false,
    });
  },
}));

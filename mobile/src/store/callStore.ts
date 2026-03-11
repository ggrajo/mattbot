import { create } from 'zustand';
import {
  type CallListItem,
  type CallDetail,
  fetchCalls as apiFetchCalls,
  fetchCallDetail as apiFetchCallDetail,
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

  loadCalls: () => Promise<void>;
  loadMore: () => Promise<void>;
  loadCallDetail: (id: string) => Promise<void>;
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
    set({ loading: true, error: null, selectedCall: null });
    try {
      const detail = await apiFetchCallDetail(id);
      set({ selectedCall: detail, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  reset: () => {
    set({
      calls: [],
      selectedCall: null,
      loading: false,
      loadingMore: false,
      error: null,
      nextCursor: null,
      hasMore: false,
    });
  },
}));

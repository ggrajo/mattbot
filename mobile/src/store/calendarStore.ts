import { create } from 'zustand';
import {
  type CalendarStatus,
  type CalendarEvent,
  getCalendarStatus,
  fetchCalendarEvents,
  disconnectCalendar as apiDisconnect,
} from '../api/calendar';
import { extractApiError } from '../api/client';

interface CalendarStore {
  status: CalendarStatus | null;
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;

  loadStatus: () => Promise<void>;
  loadEvents: (daysAhead?: number) => Promise<void>;
  disconnect: () => Promise<void>;
  reset: () => void;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  status: null,
  events: [],
  loading: false,
  error: null,

  loadStatus: async () => {
    set({ loading: true, error: null });
    try {
      const status = await getCalendarStatus();
      set({ status, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  loadEvents: async (daysAhead?: number) => {
    set({ loading: true, error: null });
    try {
      const events = await fetchCalendarEvents(daysAhead);
      set({ events, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  disconnect: async () => {
    set({ loading: true, error: null });
    try {
      await apiDisconnect();
      set({ status: { connected: false, email: null, calendar_id: null }, events: [], loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  reset: () => {
    set({ status: null, events: [], loading: false, error: null });
  },
}));

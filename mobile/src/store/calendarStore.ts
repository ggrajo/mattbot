import { create } from 'zustand';
import {
  CalendarEvent,
  CalendarStatus,
  disconnectCalendar as apiDisconnect,
  getCalendarEvents,
  getCalendarStatus,
} from '../api/calendar';

interface CalendarStore {
  status: CalendarStatus | null;
  events: CalendarEvent[];
  loading: boolean;
  error: string | null;
  loadStatus: () => Promise<void>;
  loadEvents: (start: string, end: string) => Promise<void>;
  disconnect: () => Promise<void>;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  status: null,
  events: [],
  loading: false,
  error: null,

  loadStatus: async () => {
    try {
      const status = await getCalendarStatus();
      set({ status, error: null });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to load calendar status' });
    }
  },

  loadEvents: async (start: string, end: string) => {
    set({ loading: true, error: null });
    try {
      const events = await getCalendarEvents(start, end);
      set({ events, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message || 'Failed to load events' });
    }
  },

  disconnect: async () => {
    try {
      await apiDisconnect();
      set({ status: { connected: false, email: null, calendar_id: null }, events: [], error: null });
    } catch (e: any) {
      set({ error: e?.message || 'Failed to disconnect calendar' });
    }
  },
}));

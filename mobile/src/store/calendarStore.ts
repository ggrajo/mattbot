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
    } catch {
      set({ status: { connected: false, email: null, calendar_id: null } });
    }
  },

  loadEvents: async (start: string, end: string) => {
    set({ loading: true, error: null });
    try {
      const events = await getCalendarEvents(start, end);
      set({ events: Array.isArray(events) ? events : [], loading: false });
    } catch {
      set({ loading: false, error: 'Could not load events. Please try again.' });
    }
  },

  disconnect: async () => {
    try {
      await apiDisconnect();
      set({ status: { connected: false, email: null, calendar_id: null }, events: [], error: null });
    } catch {
      set({ error: 'Could not disconnect calendar. Please try again.' });
    }
  },
}));

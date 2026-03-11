import { create } from 'zustand';
import {
  calendarApi,
  CalendarStatus,
  CalendarEvent,
  AvailabilitySlot,
  BookingRequest,
  BookingResponse,
} from '../api/calendar';
import { extractApiError } from '../api/client';

interface CalendarStore {
  status: CalendarStatus | null;
  events: CalendarEvent[];
  slots: AvailabilitySlot[];
  loading: boolean;
  error: string | null;

  fetchStatus: () => Promise<void>;
  connect: (authCode: string) => Promise<boolean>;
  disconnect: () => Promise<void>;
  fetchEvents: (limit?: number) => Promise<void>;
  fetchAvailability: (date: string, durationMinutes?: number) => Promise<void>;
  book: (data: BookingRequest) => Promise<BookingResponse | null>;
}

export const useCalendarStore = create<CalendarStore>((set) => ({
  status: null,
  events: [],
  slots: [],
  loading: false,
  error: null,

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await calendarApi.getStatus();
      set({ status: data, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  connect: async (authCode) => {
    set({ loading: true, error: null });
    try {
      const { data } = await calendarApi.connect(authCode);
      set({ status: data, loading: false });
      return true;
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
      return false;
    }
  },

  disconnect: async () => {
    set({ loading: true, error: null });
    try {
      await calendarApi.disconnect();
      set({ status: { is_connected: false, calendar_id: null }, events: [], loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  fetchEvents: async (limit) => {
    set({ loading: true, error: null });
    try {
      const { data } = await calendarApi.getEvents(limit);
      set({ events: data, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  fetchAvailability: async (date, durationMinutes) => {
    set({ loading: true, error: null });
    try {
      const { data } = await calendarApi.getAvailability(date, durationMinutes);
      set({ slots: data.slots, loading: false });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  book: async (bookingData) => {
    set({ loading: true, error: null });
    try {
      const { data } = await calendarApi.book(bookingData);
      set({ loading: false });
      return data;
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
      return null;
    }
  },
}));

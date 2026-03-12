import { create } from 'zustand';
import {
  type Reminder,
  type ReminderCreateParams,
  type ReminderUpdateParams,
  listReminders as apiListReminders,
  createReminder as apiCreateReminder,
  updateReminder as apiUpdateReminder,
  completeReminder as apiCompleteReminder,
  cancelReminder as apiCancelReminder,
  deleteReminder as apiDeleteReminder,
} from '../api/reminders';
import { extractApiError } from '../api/client';

interface ReminderStore {
  items: Reminder[];
  loading: boolean;
  error: string | null;

  loadReminders: () => Promise<void>;
  addReminder: (callId: string, params: ReminderCreateParams) => Promise<boolean>;
  editReminder: (id: string, params: ReminderUpdateParams) => Promise<boolean>;
  completeReminder: (id: string) => Promise<boolean>;
  cancelReminder: (id: string) => Promise<boolean>;
  removeReminder: (id: string) => Promise<boolean>;
  reset: () => void;
}

export const useReminderStore = create<ReminderStore>((set) => ({
  items: [],
  loading: false,
  error: null,

  loadReminders: async () => {
    set({ loading: true, error: null });
    try {
      const result = await apiListReminders();
      set({ items: result.items, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  addReminder: async (callId, params) => {
    set({ error: null });
    try {
      const entry = await apiCreateReminder(callId, params);
      set((state) => ({ items: [entry, ...state.items] }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  editReminder: async (id, params) => {
    set({ error: null });
    try {
      const updated = await apiUpdateReminder(id, params);
      set((state) => ({
        items: state.items.map((r) => (r.id === id ? updated : r)),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  completeReminder: async (id) => {
    set({ error: null });
    try {
      const updated = await apiCompleteReminder(id);
      set((state) => ({
        items: state.items.map((r) => (r.id === id ? updated : r)),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  cancelReminder: async (id) => {
    set({ error: null });
    try {
      const updated = await apiCancelReminder(id);
      set((state) => ({
        items: state.items.map((r) => (r.id === id ? updated : r)),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  removeReminder: async (id) => {
    set({ error: null });
    try {
      await apiDeleteReminder(id);
      set((state) => ({ items: state.items.filter((r) => r.id !== id) }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () => set({ items: [], loading: false, error: null }),
}));

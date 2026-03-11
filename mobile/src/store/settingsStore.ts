import { create } from 'zustand';

export interface Settings {
  biometric_unlock_enabled: boolean;
  theme_preference: string;
  quiet_hours_enabled: boolean;
  timezone?: string;
}

export interface Onboarding {
  is_complete: boolean;
  steps_completed: string[];
  completed_steps?: string[];
}

interface SettingsStore {
  settings: Settings | null;
  onboarding: Onboarding | null;
  error: string | undefined;
  loadSettings: () => Promise<void>;
  loadOnboarding: () => Promise<void>;
  completeStep: (step: string) => Promise<void>;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  onboarding: null,
  error: undefined,

  loadSettings: async () => {
    try {
      const { apiClient } = await import('../api/client');
      const { data } = await apiClient.get('/settings');
      set({ settings: data, error: undefined });
      if (data.timezone) {
        const { setUserTimezone } = await import('../utils/formatDate');
        setUserTimezone(data.timezone);
      }
    } catch {
      set({ error: undefined });
    }
  },

  loadOnboarding: async () => {
    try {
      const { apiClient } = await import('../api/client');
      const { data } = await apiClient.get('/onboarding');
      set({ onboarding: data, error: undefined });
    } catch (e: any) {
      const status = e?.response?.status;
      if (status === 401 || status === 403) {
        set({ onboarding: { is_complete: true, steps_completed: [] }, error: undefined });
      }
    }
  },

  completeStep: async (step: string) => {
    try {
      const { apiClient } = await import('../api/client');
      const { data } = await apiClient.post('/onboarding/complete-step', { step });
      set({ onboarding: data });
    } catch {
      // non-blocking
    }
  },

  reset: () => {
    set({ settings: null, onboarding: null, error: undefined });
    import('../utils/formatDate').then(({ setUserTimezone }) => setUserTimezone(''));
  },
}));

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
    } catch {
      set({ error: undefined });
    }
  },

  loadOnboarding: async () => {
    try {
      const { apiClient } = await import('../api/client');
      const { data } = await apiClient.get('/onboarding');
      set({ onboarding: data, error: undefined });
    } catch {
      set({ onboarding: { is_complete: true, steps_completed: [] }, error: undefined });
    }
  },

  completeStep: async (step: string) => {
    try {
      const { apiClient } = await import('../api/client');
      await apiClient.post('/onboarding/complete-step', { step });
      const current = get().onboarding;
      const steps = [...(current?.completed_steps ?? []), step];
      set({ onboarding: { ...current, is_complete: false, completed_steps: steps } });
    } catch {
      // non-blocking
    }
  },
}));

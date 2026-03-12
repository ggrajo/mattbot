import { create } from 'zustand';
import {
  type UserSettings,
  getSettings as fetchSettings,
  patchSettings as apiPatchSettings,
} from '../api/settings';
import {
  type OnboardingState,
  getOnboarding as fetchOnboarding,
  completeOnboardingStep as apiCompleteStep,
} from '../api/onboarding';

interface SettingsStore {
  settings: UserSettings | null;
  onboarding: OnboardingState | null;
  loading: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSettings: (changes: Partial<Omit<UserSettings, 'revision'>>) => Promise<boolean>;
  loadOnboarding: () => Promise<void>;
  completeStep: (step: string) => Promise<boolean>;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  onboarding: null,
  loading: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await fetchSettings();
      set({ settings, loading: false });
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'Failed to load settings';
      set({ error: msg, loading: false });
    }
  },

  updateSettings: async (changes) => {
    const current = get().settings;
    if (!current) return false;

    set({ loading: true, error: null });
    try {
      const result = await apiPatchSettings(current.revision, changes);
      set({ settings: result.settings, loading: false });
      return true;
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === 'REVISION_CONFLICT') {
        try {
          const fresh = await fetchSettings();
          set({ settings: fresh, loading: false, error: 'Settings were updated on another device. Please review and try again.' });
        } catch {
          set({ loading: false, error: 'Settings conflict. Please refresh.' });
        }
        return false;
      }
      const msg = e?.response?.data?.error?.message || 'Failed to save settings';
      set({ error: msg, loading: false });
      return false;
    }
  },

  loadOnboarding: async () => {
    set({ loading: true, error: null });
    try {
      const onboarding = await fetchOnboarding();
      set({ onboarding, loading: false });
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'Failed to load onboarding state';
      set({ error: msg, loading: false });
    }
  },

  completeStep: async (step: string) => {
    set({ loading: true, error: null });
    try {
      const onboarding = await apiCompleteStep(step);
      set({ onboarding, loading: false });
      return true;
    } catch (e: any) {
      const msg = e?.response?.data?.error?.message || 'Failed to complete step';
      set({ error: msg, loading: false });
      return false;
    }
  },

  reset: () => {
    set({ settings: null, onboarding: null, loading: false, error: null });
  },
}));

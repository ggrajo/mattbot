import { create } from 'zustand';
import {
  type UserSettings,
  fetchSettings,
  patchSettings as apiPatchSettings,
} from '../api/settings';
import {
  type OnboardingState,
  getOnboarding as fetchOnboarding,
  completeOnboardingStep as apiCompleteStep,
} from '../api/onboarding';
import { extractApiError } from '../api/client';

interface SettingsStore {
  settings: UserSettings | null;
  onboarding: OnboardingState | null;
  loading: boolean;
  saving: boolean;
  error: string | null;

  loadSettings: () => Promise<void>;
  updateSettings: (changes: Record<string, unknown>) => Promise<boolean>;
  loadOnboarding: () => Promise<void>;
  completeStep: (step: string) => Promise<boolean>;
  reset: () => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: null,
  onboarding: null,
  loading: false,
  saving: false,
  error: null,

  loadSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await fetchSettings();
      set({ settings, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  updateSettings: async (changes) => {
    const current = get().settings;
    if (!current) {
      try {
        const fresh = await fetchSettings();
        set({ settings: fresh });
        return get().updateSettings(changes);
      } catch (e: unknown) {
        set({ error: extractApiError(e) });
        return false;
      }
    }

    set({ saving: true, error: null });
    try {
      const result = await apiPatchSettings(current.revision, changes);
      set({ settings: result.settings, saving: false });
      return true;
    } catch (e: any) {
      const code = e?.response?.data?.error?.code;
      if (code === 'REVISION_CONFLICT') {
        try {
          const fresh = await fetchSettings();
          set({ settings: fresh, saving: false, error: 'Settings were updated on another device. Please review and try again.' });
        } catch {
          set({ saving: false, error: 'Settings conflict. Please refresh.' });
        }
        return false;
      }
      set({ error: extractApiError(e), saving: false });
      return false;
    }
  },

  loadOnboarding: async () => {
    set({ loading: true, error: null });
    try {
      const onboarding = await fetchOnboarding();
      set({ onboarding, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  completeStep: async (step: string) => {
    set({ saving: true, error: null });
    try {
      const onboarding = await apiCompleteStep(step);
      set({ onboarding, saving: false });
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e), saving: false });
      return false;
    }
  },

  reset: () => {
    set({ settings: null, onboarding: null, loading: false, saving: false, error: null });
  },
}));

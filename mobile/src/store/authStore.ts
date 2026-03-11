import { create } from 'zustand';
import { storeTokens, clearTokens, getStoredTokens, getPinDeviceId } from '../utils/secureStorage';

type AuthState = 'loading' | 'unauthenticated' | 'pin_login' | 'mfa_required' | 'mfa_enrollment' | 'authenticated';

interface AuthStore {
  state: AuthState;
  accessToken: string | null;
  mfaChallengeToken: string | null;
  partialToken: string | null;
  recoveryCodes: string[] | null;
  totpSecret: string | null;
  totpQrUri: string | null;
  mfaSetupToken: string | null;
  pendingAccessToken: string | null;
  pendingRefreshToken: string | null;
  displayName: string | null;
  nickname: string | null;
  hasPassword: boolean;

  setAuthenticated: (accessToken: string, refreshToken: string) => Promise<void>;
  setPendingTokens: (accessToken: string, refreshToken: string) => void;
  activatePendingTokens: () => Promise<void>;
  setMfaRequired: (challengeToken: string) => void;
  setMfaEnrollment: (partialToken: string) => void;
  setTotpSetup: (secret: string, qrUri: string, setupToken: string) => void;
  setRecoveryCodes: (codes: string[]) => void;
  signOut: () => Promise<void>;
  tryRestoreSession: () => Promise<boolean>;
  loadProfile: () => Promise<void>;
  setProfileName: (displayName: string | null, nickname: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  state: 'loading',
  accessToken: null,
  mfaChallengeToken: null,
  partialToken: null,
  recoveryCodes: null,
  totpSecret: null,
  totpQrUri: null,
  mfaSetupToken: null,
  pendingAccessToken: null,
  pendingRefreshToken: null,
  displayName: null,
  nickname: null,
  hasPassword: false,

  setAuthenticated: async (accessToken, refreshToken) => {
    await storeTokens(accessToken, refreshToken);
    set({
      state: 'authenticated',
      accessToken,
      mfaChallengeToken: null,
      partialToken: null,
      recoveryCodes: null,
      totpSecret: null,
      totpQrUri: null,
      mfaSetupToken: null,
      pendingAccessToken: null,
      pendingRefreshToken: null,
    });
  },

  setPendingTokens: (accessToken, refreshToken) => {
    set({ pendingAccessToken: accessToken, pendingRefreshToken: refreshToken });
  },

  activatePendingTokens: async () => {
    const { pendingAccessToken, pendingRefreshToken } = get();
    if (pendingAccessToken && pendingRefreshToken) {
      await storeTokens(pendingAccessToken, pendingRefreshToken);
      set({
        state: 'authenticated',
        accessToken: pendingAccessToken,
        mfaChallengeToken: null,
        partialToken: null,
        recoveryCodes: null,
        totpSecret: null,
        totpQrUri: null,
        mfaSetupToken: null,
        pendingAccessToken: null,
        pendingRefreshToken: null,
      });
    }
  },

  setMfaRequired: (challengeToken) => {
    set({ state: 'mfa_required', mfaChallengeToken: challengeToken });
  },

  setMfaEnrollment: (partialToken) => {
    set({ state: 'mfa_enrollment', partialToken });
  },

  setTotpSetup: (secret, qrUri, setupToken) => {
    set({ totpSecret: secret, totpQrUri: qrUri, mfaSetupToken: setupToken });
  },

  setRecoveryCodes: (codes) => {
    set({ recoveryCodes: codes });
  },

  signOut: async () => {
    await clearTokens();
    set({
      state: 'unauthenticated',
      accessToken: null,
      mfaChallengeToken: null,
      partialToken: null,
      recoveryCodes: null,
      totpSecret: null,
      totpQrUri: null,
      mfaSetupToken: null,
      pendingAccessToken: null,
      pendingRefreshToken: null,
      displayName: null,
      nickname: null,
      hasPassword: false,
    });
  },

  loadProfile: async () => {
    try {
      const { getProfile } = await import('../api/auth');
      const profile = await getProfile();
      set({ displayName: profile.display_name, nickname: profile.nickname, hasPassword: profile.has_password });
    } catch {
      // Non-blocking; profile is cosmetic
    }
  },

  setProfileName: (displayName, nickname) => {
    set({ displayName, nickname });
  },

  tryRestoreSession: async () => {
    const { refreshToken } = await getStoredTokens();
    if (!refreshToken) {
      const pinDeviceId = await getPinDeviceId();
      if (pinDeviceId) {
        set({ state: 'pin_login' });
        return false;
      }
      set({ state: 'unauthenticated' });
      return false;
    }
    try {
      const { default: axios } = await import('axios');
      const { API_BASE_URL } = await import('../api/client');
      const { data } = await axios.post(`${API_BASE_URL}/auth/token/refresh`, {
        refresh_token: refreshToken,
      });
      await storeTokens(data.access_token, data.refresh_token);
      set({ state: 'authenticated', accessToken: data.access_token });
      return true;
    } catch (err: any) {
      const status = err?.response?.status;
      if (status === 401 || status === 403) {
        await clearTokens();
        const pinDeviceId = await getPinDeviceId();
        if (pinDeviceId) {
          set({ state: 'pin_login' });
        } else {
          set({ state: 'unauthenticated' });
        }
      } else {
        const { accessToken } = await getStoredTokens();
        if (accessToken) {
          set({ state: 'authenticated', accessToken });
          return true;
        }
        set({ state: 'unauthenticated' });
      }
      return false;
    }
  },
}));

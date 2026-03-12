import { create } from 'zustand';
import { storeTokens, clearTokens, getStoredTokens } from '../utils/secureStorage';

type AuthState = 'loading' | 'unauthenticated' | 'mfa_required' | 'mfa_enrollment' | 'authenticated';

interface AuthStore {
  state: AuthState;
  accessToken: string | null;
  nickname: string | null;
  displayName: string | null;
  mfaChallengeToken: string | null;
  partialToken: string | null;
  recoveryCodes: string[] | null;
  totpSecret: string | null;
  totpQrUri: string | null;
  mfaSetupToken: string | null;
  pendingAccessToken: string | null;
  pendingRefreshToken: string | null;

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
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  state: 'loading',
  accessToken: null,
  nickname: null,
  displayName: null,
  mfaChallengeToken: null,
  partialToken: null,
  recoveryCodes: null,
  totpSecret: null,
  totpQrUri: null,
  mfaSetupToken: null,
  pendingAccessToken: null,
  pendingRefreshToken: null,

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
    });
  },

  tryRestoreSession: async () => {
    const { refreshToken } = await getStoredTokens();
    if (!refreshToken) {
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
    } catch {
      await clearTokens();
      set({ state: 'unauthenticated' });
      return false;
    }
  },

  loadProfile: async () => {
    try {
      const { apiClient } = await import('../api/client');
      const { data } = await apiClient.get('/me');
      set({
        nickname: data.nickname ?? null,
        displayName: data.display_name ?? data.email ?? null,
      });
    } catch {
      // profile load failure is non-critical
    }
  },
}));

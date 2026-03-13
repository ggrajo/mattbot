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
  reset: () => void;
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
    });
  },

  tryRestoreSession: async () => {
    const { accessToken, refreshToken } = await getStoredTokens();

    if (!refreshToken) {
      set({ state: 'unauthenticated' });
      return false;
    }

    // Try using stored access token first (faster, avoids refresh roundtrip)
    if (accessToken) {
      try {
        const { default: axios } = await import('axios');
        const { API_BASE_URL } = await import('../api/client');
        await axios.get(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          timeout: 5000,
        });
        set({ state: 'authenticated', accessToken });
        return true;
      } catch {
        // Token expired or invalid, fall through to refresh
      }
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
      // Only clear tokens on definitive auth rejection (4xx).
      // Network errors / timeouts / 5xx → trust the stored tokens and let
      // the axios interceptor retry refresh on the next real API call.
      if (status && status >= 400 && status < 500) {
        await clearTokens();
        set({ state: 'unauthenticated' });
        return false;
      }
      // Network/server error — keep tokens, assume still authenticated
      if (accessToken) {
        set({ state: 'authenticated', accessToken });
        return true;
      }
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

      const { Platform } = await import('react-native');
      const DeviceInfo = await import('react-native-device-info').then(m => m.default).catch(() => null);
      const deviceName = DeviceInfo ? await DeviceInfo.getDeviceName() : Platform.OS;
      const osVersion = DeviceInfo ? `${Platform.OS} ${DeviceInfo.getSystemVersion()}` : Platform.OS;
      const appVersion = DeviceInfo ? DeviceInfo.getVersion() : '0.1.0';
      const storedId = DeviceInfo ? await DeviceInfo.getUniqueId() : undefined;

      const { getSecureItem, setSecureItem } = await import('../utils/secureStorage');
      let deviceId: string | undefined = await getSecureItem('mattbot_device_id') ?? undefined;
      if (!deviceId && storedId) {
        deviceId = storedId;
      }

      const regPayload: Record<string, any> = {
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        device_name: deviceName,
        app_version: appVersion,
        os_version: osVersion,
      };
      if (deviceId) regPayload.device_id = deviceId;

      try {
        const { data: dev } = await apiClient.post('/devices/register-or-update', regPayload);
        if (dev?.id) {
          await setSecureItem('mattbot_device_id', dev.id);

          try {
            const messaging = await import('@react-native-firebase/messaging').then(m => m.default).catch(() => null);
            if (messaging) {
              const authStatus = await messaging().requestPermission();
              const enabled = authStatus === messaging.AuthorizationStatus.AUTHORIZED
                || authStatus === messaging.AuthorizationStatus.PROVISIONAL;
              if (enabled) {
                const fcmToken = await messaging().getToken();
                if (fcmToken) {
                  const { registerPushToken } = await import('../api/push');
                  await registerPushToken(dev.id, fcmToken);
                }
              }
            }
          } catch {
            // push registration failure is non-critical
          }
        }
      } catch {
        // device registration failure is non-critical
      }
    } catch {
      // profile load failure is non-critical
    }
  },

  reset: () => {
    set({
      state: 'unauthenticated',
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
    });
  },
}));

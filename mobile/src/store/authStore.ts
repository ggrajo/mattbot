import { create } from 'zustand';
import * as Keychain from 'react-native-keychain';
import { storeTokens, clearTokens, getStoredTokens } from '../utils/secureStorage';

type AuthState = 'loading' | 'unauthenticated' | 'mfa_required' | 'mfa_enrollment' | 'authenticated';

interface AuthStore {
  state: AuthState;
  accessToken: string | null;
  mfaChallengeToken: string | null;
  partialToken: string | null;
  recoveryCodes: string[] | null;
  totpSecret: string | null;
  totpQrUri: string | null;
  mfaSetupToken: string | null;
  biometricEnabled: boolean;
  biometricType: string | null;

  setAuthenticated: (accessToken: string, refreshToken: string) => Promise<void>;
  setMfaRequired: (challengeToken: string) => void;
  setMfaEnrollment: (partialToken: string) => void;
  setTotpSetup: (secret: string, qrUri: string, setupToken: string) => void;
  setRecoveryCodes: (codes: string[]) => void;
  setBiometric: (enabled: boolean, type?: string) => void;
  tryBiometricLogin: () => Promise<boolean>;
  signOut: () => Promise<void>;
  tryRestoreSession: () => Promise<boolean>;
}

export const useAuthStore = create<AuthStore>((set) => ({
  state: 'loading',
  accessToken: null,
  mfaChallengeToken: null,
  partialToken: null,
  recoveryCodes: null,
  totpSecret: null,
  totpQrUri: null,
  mfaSetupToken: null,
  biometricEnabled: false,
  biometricType: null,

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
    });
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

  setBiometric: (enabled, type) => {
    set({ biometricEnabled: enabled, biometricType: type ?? null });
  },

  tryBiometricLogin: async () => {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      if (!biometryType) return false;

      const credentials = await Keychain.getGenericPassword({
        service: 'com.mattbot.biometric_check',
        accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
        authenticationPrompt: { title: 'Authenticate to sign in' },
      });

      if (!credentials) return false;

      const { refreshToken } = await getStoredTokens();
      if (!refreshToken) return false;

      const { default: axios } = await import('axios');
      const { data } = await axios.post('http://localhost:8000/api/v1/auth/token/refresh', {
        refresh_token: refreshToken,
      });
      await storeTokens(data.access_token, data.refresh_token);
      set({
        state: 'authenticated',
        accessToken: data.access_token,
        biometricEnabled: true,
        biometricType: biometryType,
      });
      return true;
    } catch {
      return false;
    }
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
      biometricEnabled: false,
      biometricType: null,
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
      const { data } = await axios.post('http://localhost:8000/api/v1/auth/token/refresh', {
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
}));

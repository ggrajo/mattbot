import { useState, useEffect, useCallback } from 'react';
import * as Keychain from 'react-native-keychain';

type BiometricType = 'FaceID' | 'TouchID' | 'Fingerprint' | null;

interface BiometricState {
  available: boolean;
  biometryType: BiometricType;
  loading: boolean;
  error: string | null;
}

interface UseBiometricReturn extends BiometricState {
  authenticate: (promptMessage?: string) => Promise<boolean>;
}

export function useBiometric(): UseBiometricReturn {
  const [state, setState] = useState<BiometricState>({
    available: false,
    biometryType: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  async function checkBiometricAvailability() {
    try {
      const biometryType = await Keychain.getSupportedBiometryType();
      setState({
        available: biometryType !== null,
        biometryType: biometryType as BiometricType,
        loading: false,
        error: null,
      });
    } catch (error) {
      setState({
        available: false,
        biometryType: null,
        loading: false,
        error: 'Failed to check biometric availability',
      });
    }
  }

  const authenticate = useCallback(
    async (promptMessage = 'Authenticate to continue'): Promise<boolean> => {
      if (!state.available) {
        return false;
      }

      try {
        const result = await Keychain.getGenericPassword({
          service: 'com.mattbot.biometric_check',
          accessControl: Keychain.ACCESS_CONTROL.BIOMETRY_ANY_OR_DEVICE_PASSCODE,
          authenticationPrompt: { title: promptMessage },
        });
        return result !== false;
      } catch {
        return false;
      }
    },
    [state.available]
  );

  return { ...state, authenticate };
}

import { useState, useEffect, useCallback } from 'react';
import ReactNativeBiometrics from 'react-native-biometrics';

type BiometryType = 'FaceID' | 'TouchID' | 'Biometrics' | null;

interface BiometricState {
  available: boolean;
  biometryType: BiometryType;
  loading: boolean;
  error: string | null;
}

interface UseBiometricReturn extends BiometricState {
  authenticate: (promptMessage?: string) => Promise<boolean>;
}

const rnBiometrics = new ReactNativeBiometrics();

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
      const { available, biometryType } = await rnBiometrics.isSensorAvailable();
      setState({
        available,
        biometryType: (biometryType as BiometryType) ?? null,
        loading: false,
        error: null,
      });
    } catch {
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
        const { success } = await rnBiometrics.simplePrompt({ promptMessage });
        return success;
      } catch {
        return false;
      }
    },
    [state.available]
  );

  return { ...state, authenticate };
}

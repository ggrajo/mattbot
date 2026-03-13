import { useState, useEffect, useCallback, useRef } from 'react';

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

export function useBiometric(): UseBiometricReturn {
  const rnBiometricsRef = useRef<any>(null);
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
      const ReactNativeBiometrics = (await import('react-native-biometrics')).default;
      const instance = new ReactNativeBiometrics();
      rnBiometricsRef.current = instance;
      const { available, biometryType } = await instance.isSensorAvailable();
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
        error: null,
      });
    }
  }

  const authenticate = useCallback(
    async (promptMessage = 'Authenticate to continue'): Promise<boolean> => {
      if (!state.available || !rnBiometricsRef.current) {
        return false;
      }

      try {
        const { success } = await rnBiometricsRef.current.simplePrompt({ promptMessage });
        return success;
      } catch {
        return false;
      }
    },
    [state.available]
  );

  return { ...state, authenticate };
}

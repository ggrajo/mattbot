import { renderHook, act } from '@testing-library/react-native';
import * as Keychain from 'react-native-keychain';
import { useBiometric } from '../../hooks/useBiometric';

describe('useBiometric', () => {
  it('checks biometric availability on mount', async () => {
    const { result } = renderHook(() => useBiometric());
    // Wait for async effect
    await act(async () => {});
    expect(Keychain.getSupportedBiometryType).toHaveBeenCalled();
    expect(result.current.available).toBe(true);
    expect(result.current.biometryType).toBe('FaceID');
    expect(result.current.loading).toBe(false);
  });

  it('returns false when biometry is unavailable', async () => {
    (Keychain.getSupportedBiometryType as jest.Mock).mockResolvedValueOnce(null);
    const { result } = renderHook(() => useBiometric());
    await act(async () => {});
    expect(result.current.available).toBe(false);
  });
});

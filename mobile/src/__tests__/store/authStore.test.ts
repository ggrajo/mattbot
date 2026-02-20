import { useAuthStore } from '../../store/authStore';
import * as secureStorage from '../../utils/secureStorage';

jest.mock('../../utils/secureStorage');

const mockSecureStorage = secureStorage as jest.Mocked<typeof secureStorage>;

describe('authStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      state: 'loading',
      accessToken: null,
      mfaChallengeToken: null,
      partialToken: null,
      recoveryCodes: null,
      totpSecret: null,
      totpQrUri: null,
      mfaSetupToken: null,
    });
    jest.clearAllMocks();
  });

  it('initializes with loading state', () => {
    expect(useAuthStore.getState().state).toBe('loading');
  });

  it('setAuthenticated stores tokens and updates state', async () => {
    await useAuthStore.getState().setAuthenticated('access123', 'refresh456');
    expect(mockSecureStorage.storeTokens).toHaveBeenCalledWith('access123', 'refresh456');
    expect(useAuthStore.getState().state).toBe('authenticated');
    expect(useAuthStore.getState().accessToken).toBe('access123');
  });

  it('setMfaRequired sets challenge token and state', () => {
    useAuthStore.getState().setMfaRequired('challenge_abc');
    expect(useAuthStore.getState().state).toBe('mfa_required');
    expect(useAuthStore.getState().mfaChallengeToken).toBe('challenge_abc');
  });

  it('setMfaEnrollment sets partial token and state', () => {
    useAuthStore.getState().setMfaEnrollment('partial_xyz');
    expect(useAuthStore.getState().state).toBe('mfa_enrollment');
    expect(useAuthStore.getState().partialToken).toBe('partial_xyz');
  });

  it('setTotpSetup stores totp details', () => {
    useAuthStore.getState().setTotpSetup('SECRET', 'otpauth://totp/...', 'setup_token');
    const state = useAuthStore.getState();
    expect(state.totpSecret).toBe('SECRET');
    expect(state.totpQrUri).toBe('otpauth://totp/...');
    expect(state.mfaSetupToken).toBe('setup_token');
  });

  it('signOut clears everything', async () => {
    await useAuthStore.getState().setAuthenticated('a', 'b');
    await useAuthStore.getState().signOut();
    const state = useAuthStore.getState();
    expect(state.state).toBe('unauthenticated');
    expect(state.accessToken).toBeNull();
    expect(mockSecureStorage.clearTokens).toHaveBeenCalled();
  });

  it('tryRestoreSession sets unauthenticated when no refresh token', async () => {
    mockSecureStorage.getStoredTokens.mockResolvedValue({ accessToken: null, refreshToken: null });
    const result = await useAuthStore.getState().tryRestoreSession();
    expect(result).toBe(false);
    expect(useAuthStore.getState().state).toBe('unauthenticated');
  });
});

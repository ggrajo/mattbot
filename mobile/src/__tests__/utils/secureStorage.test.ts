import * as Keychain from 'react-native-keychain';
import { setSecureItem, getSecureItem, removeSecureItem, storeTokens, getStoredTokens, clearTokens } from '../../utils/secureStorage';

jest.mock('react-native-keychain');

describe('secureStorage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('setSecureItem', () => {
    it('stores an item with correct service prefix', async () => {
      await setSecureItem('test_key', 'test_value');
      expect(Keychain.setGenericPassword).toHaveBeenCalledWith(
        'test_key',
        'test_value',
        expect.objectContaining({ service: 'com.mattbot.test_key' })
      );
    });
  });

  describe('getSecureItem', () => {
    it('returns the stored value', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue({
        username: 'key',
        password: 'stored_value',
      });
      const result = await getSecureItem('test_key');
      expect(result).toBe('stored_value');
    });

    it('returns null when no value is stored', async () => {
      (Keychain.getGenericPassword as jest.Mock).mockResolvedValue(false);
      const result = await getSecureItem('test_key');
      expect(result).toBeNull();
    });
  });

  describe('removeSecureItem', () => {
    it('calls resetGenericPassword with correct service', async () => {
      await removeSecureItem('test_key');
      expect(Keychain.resetGenericPassword).toHaveBeenCalledWith(
        expect.objectContaining({ service: 'com.mattbot.test_key' })
      );
    });
  });

  describe('storeTokens', () => {
    it('stores both access and refresh tokens', async () => {
      await storeTokens('access123', 'refresh456');
      expect(Keychain.setGenericPassword).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStoredTokens', () => {
    it('retrieves both tokens', async () => {
      (Keychain.getGenericPassword as jest.Mock)
        .mockResolvedValueOnce({ username: 'k', password: 'access' })
        .mockResolvedValueOnce({ username: 'k', password: 'refresh' });
      const result = await getStoredTokens();
      expect(result.accessToken).toBe('access');
      expect(result.refreshToken).toBe('refresh');
    });
  });

  describe('clearTokens', () => {
    it('removes both tokens', async () => {
      await clearTokens();
      expect(Keychain.resetGenericPassword).toHaveBeenCalledTimes(2);
    });
  });
});

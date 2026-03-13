import * as Keychain from 'react-native-keychain';

const SERVICE_PREFIX = 'com.mattbot.';

export async function setSecureItem(key: string, value: string): Promise<void> {
  await Keychain.setGenericPassword(key, value, {
    service: `${SERVICE_PREFIX}${key}`,
    accessible: Keychain.ACCESSIBLE.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  });
}

export async function getSecureItem(key: string): Promise<string | null> {
  const result = await Keychain.getGenericPassword({
    service: `${SERVICE_PREFIX}${key}`,
  });
  if (result && typeof result !== 'boolean') {
    return result.password;
  }
  return null;
}

export async function removeSecureItem(key: string): Promise<void> {
  await Keychain.resetGenericPassword({
    service: `${SERVICE_PREFIX}${key}`,
  });
}

export const TOKEN_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  BIOMETRIC_REFRESH_TOKEN: 'mattbot_biometric_refresh_token',
} as const;

export async function storeTokens(accessToken: string, refreshToken: string): Promise<void> {
  await setSecureItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken);
  await setSecureItem(TOKEN_KEYS.REFRESH_TOKEN, refreshToken);

  const existingBioToken = await getSecureItem(TOKEN_KEYS.BIOMETRIC_REFRESH_TOKEN);
  if (existingBioToken) {
    await setSecureItem(TOKEN_KEYS.BIOMETRIC_REFRESH_TOKEN, refreshToken);
  }
}

export async function getStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
  const accessToken = await getSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
  const refreshToken = await getSecureItem(TOKEN_KEYS.REFRESH_TOKEN);
  return { accessToken, refreshToken };
}

export async function clearTokens(): Promise<void> {
  await removeSecureItem(TOKEN_KEYS.ACCESS_TOKEN);
  await removeSecureItem(TOKEN_KEYS.REFRESH_TOKEN);
  await removeSecureItem(TOKEN_KEYS.BIOMETRIC_REFRESH_TOKEN);
}

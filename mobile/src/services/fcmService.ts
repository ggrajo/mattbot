import AsyncStorage from '@react-native-async-storage/async-storage';

const FCM_TOKEN_KEY = 'mattbot_fcm_token';

export async function getFcmToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(FCM_TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function storeFcmToken(token: string): Promise<void> {
  await AsyncStorage.setItem(FCM_TOKEN_KEY, token);
}

export async function registerPushToken(_apiToken: string): Promise<void> {
  const fcmToken = await getFcmToken();
  if (!fcmToken) return;
  try {
    const { apiClient } = await import('../api/client');
    await apiClient.post('/push/register', { token: fcmToken, platform: 'fcm' });
  } catch {}
}

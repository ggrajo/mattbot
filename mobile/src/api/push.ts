import { apiClient } from './client';

export async function registerPushToken(deviceId: string, token: string) {
  const { data } = await apiClient.post('/push/register', {
    device_id: deviceId,
    provider: 'fcm',
    token,
  });
  return data;
}

export async function sendTestNotification(): Promise<void> {
  await apiClient.post('/push/test');
}

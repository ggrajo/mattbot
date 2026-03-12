import { Platform } from 'react-native';
import { apiClient } from './client';

export interface DeviceInfo {
  id: string;
  platform: string;
  device_name: string | null;
  app_version: string | null;
  os_version: string | null;
  last_ip: string | null;
  last_location: string | null;
  last_seen_at: string | null;
  created_at: string;
  is_current: boolean;
  remembered: boolean;
}

export async function listDevices(): Promise<{ items: DeviceInfo[] }> {
  const { data } = await apiClient.get('/devices');
  return data;
}

export async function revokeDevice(deviceId: string, stepUpToken: string) {
  const { data } = await apiClient.post(
    `/devices/${deviceId}/revoke`,
    {},
    { headers: { 'X-Step-Up-Token': stepUpToken } }
  );
  return data;
}

export async function deleteDevice(deviceId: string) {
  await apiClient.delete(`/devices/${deviceId}`);
}

export async function updateDevice(
  deviceId: string,
  body: { remembered?: boolean; device_name?: string },
) {
  const { data } = await apiClient.patch(`/devices/${deviceId}`, body);
  return data;
}

export async function registerOrUpdateDevice(body: {
  device_id?: string;
  platform: string;
  device_name?: string;
  app_version?: string;
  os_version?: string;
}) {
  const { data } = await apiClient.post('/devices/register-or-update', body);
  return data;
}

export async function registerDevice() {
  const info = {
    platform: Platform.OS === 'ios' ? 'ios' : 'android',
    device_name: `${Platform.OS === 'ios' ? 'iOS' : 'Android'} Device`,
    os_version: `${Platform.Version}`,
  };
  return registerOrUpdateDevice(info);
}

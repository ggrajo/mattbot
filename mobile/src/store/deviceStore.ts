import { create } from 'zustand';
import { DeviceInfo, listDevices } from '../api/devices';
import { extractApiError } from '../api/client';

interface DeviceStore {
  devices: DeviceInfo[];
  loading: boolean;
  error: string | null;
  device: DeviceInfo | null; // Current device
  fetchDevices: () => Promise<void>;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  device: null,
  loading: false,
  error: null,

  fetchDevices: async () => {
    set({ loading: true, error: null });
    try {
      const result = await listDevices();
      const devices = result.items;
      const currentDevice = devices.find((d) => d.is_current) || devices[0] || null;
      set({ devices, device: currentDevice, loading: false });
    } catch (e) {
      set({ error: extractApiError(e), loading: false });
    }
  },
}));

import { create } from 'zustand';
import { DeviceInfo, listDevices } from '../api/devices';

interface DeviceStore {
  devices: DeviceInfo[];
  loading: boolean;
  error: string | null;
  fetchDevices: () => Promise<void>;
}

export const useDeviceStore = create<DeviceStore>((set) => ({
  devices: [],
  loading: false,
  error: null,

  fetchDevices: async () => {
    set({ loading: true, error: null });
    try {
      const result = await listDevices();
      const sorted = [...result.items].sort((a, b) => {
        if (a.is_current && !b.is_current) return -1;
        if (!a.is_current && b.is_current) return 1;
        return 0;
      });
      set({ devices: sorted, loading: false });
    } catch (e) {
      set({ error: 'Failed to load devices', loading: false });
    }
  },
}));

import { create } from 'zustand';
import {
  type ProvisionedNumber,
  type CallModes,
  type CallModesPatch,
  listNumbers as apiListNumbers,
  getCallModes as apiGetCallModes,
  patchCallModes as apiPatchCallModes,
} from '../api/telephony';
import { extractApiError } from '../api/client';

interface TelephonyStore {
  numbers: ProvisionedNumber[];
  activeNumber: ProvisionedNumber | null;
  callModes: CallModes | null;
  loading: boolean;
  error: string | null;

  loadNumbers: () => Promise<void>;
  loadCallModes: () => Promise<void>;
  updateCallModes: (patch: CallModesPatch) => Promise<boolean>;
  reset: () => void;
}

export function maskPhone(e164: string): string {
  if (!e164 || e164.length < 6) return e164 ?? '';
  const countryCode = e164.startsWith('+1') ? '+1' : e164.slice(0, e164.length - 10);
  const last4 = e164.slice(-4);
  const masked = '*'.repeat(Math.max(0, e164.length - countryCode.length - 4));
  return `${countryCode}${masked}${last4}`;
}

export const useTelephonyStore = create<TelephonyStore>((set) => ({
  numbers: [],
  activeNumber: null,
  callModes: null,
  loading: false,
  error: null,

  loadNumbers: async () => {
    set({ loading: true, error: null });
    try {
      const result = await apiListNumbers();
      const nums = result.items ?? [];
      set({
        numbers: nums,
        activeNumber: nums.length > 0 ? nums[0] : null,
        loading: false,
      });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  loadCallModes: async () => {
    set({ loading: true, error: null });
    try {
      const modes = await apiGetCallModes();
      set({ callModes: modes, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  updateCallModes: async (patch) => {
    set({ error: null });
    try {
      const modes = await apiPatchCallModes(patch);
      set({ callModes: modes });
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () =>
    set({ numbers: [], activeNumber: null, callModes: null, loading: false, error: null }),
}));

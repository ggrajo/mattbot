import { create } from 'zustand';

export interface BillingStatus {
  plan: string;
  minutes_used: number;
  minutes_included: number;
  minutes_carried_over: number;
  current_period_end: string | null;
}

export interface BillingPlan {
  code: string;
  name: string;
  price_usd: string;
  limited: boolean;
  minutes_included: number;
}

interface BillingStore {
  billingStatus: BillingStatus | null;
  plans: BillingPlan[];
  error: string | undefined;
  loadBillingStatus: () => Promise<void>;
  loadPlans: () => Promise<void>;
  reset: () => void;
}

export const useBillingStore = create<BillingStore>((set) => ({
  billingStatus: null,
  plans: [],
  error: undefined,

  loadBillingStatus: async () => {
    try {
      const { apiClient } = await import('../api/client');
      const { data } = await apiClient.get('/billing/status');
      set({ billingStatus: data, error: undefined });
    } catch {
      set({ billingStatus: null, error: undefined });
    }
  },

  loadPlans: async () => {
    try {
      const { apiClient } = await import('../api/client');
      const { data } = await apiClient.get('/billing/plans');
      set({ plans: data?.plans ?? data ?? [], error: undefined });
    } catch {
      set({ plans: [], error: undefined });
    }
  },

  reset: () => {
    set({ billingStatus: null, plans: [], error: undefined });
  },
}));

export function useIsSubscriptionActive(): boolean {
  return useBillingStore((s) => {
    if (s.billingStatus == null) return true;
    return s.billingStatus.plan !== 'free';
  });
}

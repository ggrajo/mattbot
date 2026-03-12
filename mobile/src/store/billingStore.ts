import { create } from 'zustand';
import {
  type BillingPlan,
  type BillingStatus,
  getPlans,
  getBillingStatus,
  subscribe as apiSubscribe,
  changePlan as apiChangePlan,
  cancelSubscription as apiCancel,
} from '../api/billing';
import { extractApiError } from '../api/client';

interface BillingStore {
  plans: BillingPlan[];
  billingStatus: BillingStatus | null;
  loading: boolean;
  error: string | null;

  loadPlans: () => Promise<void>;
  loadBillingStatus: () => Promise<void>;
  subscribe: (plan: string, paymentMethodId?: string) => Promise<boolean>;
  changePlan: (newPlan: string) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  reset: () => void;
}

export const useBillingStore = create<BillingStore>((set) => ({
  plans: [],
  billingStatus: null,
  loading: false,
  error: null,

  loadPlans: async () => {
    set({ loading: true, error: null });
    try {
      const { plans } = await getPlans();
      set({ plans, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  loadBillingStatus: async () => {
    set({ loading: true, error: null });
    try {
      const billingStatus = await getBillingStatus();
      set({ billingStatus, loading: false });
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
    }
  },

  subscribe: async (plan, paymentMethodId) => {
    set({ loading: true, error: null });
    try {
      await apiSubscribe(plan, paymentMethodId ?? '');
      const billingStatus = await getBillingStatus();
      set({ billingStatus, loading: false });
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
      return false;
    }
  },

  changePlan: async (newPlan) => {
    set({ loading: true, error: null });
    try {
      await apiChangePlan(newPlan);
      const billingStatus = await getBillingStatus();
      set({ billingStatus, loading: false });
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
      return false;
    }
  },

  cancelSubscription: async () => {
    set({ loading: true, error: null });
    try {
      await apiCancel();
      const billingStatus = await getBillingStatus();
      set({ billingStatus, loading: false });
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e), loading: false });
      return false;
    }
  },

  reset: () => set({ plans: [], billingStatus: null, loading: false, error: null }),
}));

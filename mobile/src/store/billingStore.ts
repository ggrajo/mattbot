import { create } from 'zustand';
import {
  type BillingPlan,
  type BillingStatus,
  type PaymentMethodItem,
  getPlans,
  getBillingStatus,
  subscribe as apiSubscribe,
  changePlan as apiChangePlan,
  cancelSubscription as apiCancel,
  listPaymentMethods as apiListPaymentMethods,
  addPaymentMethod as apiAddPaymentMethod,
  removePaymentMethod as apiRemovePaymentMethod,
  setDefaultPaymentMethod as apiSetDefaultPaymentMethod,
} from '../api/billing';
import { extractApiError } from '../api/client';

interface BillingStore {
  plans: BillingPlan[];
  billingStatus: BillingStatus | null;
  paymentMethods: PaymentMethodItem[];
  loading: boolean;
  error: string | null;

  loadPlans: () => Promise<void>;
  loadBillingStatus: () => Promise<void>;
  subscribe: (plan: string, paymentMethodId?: string) => Promise<boolean>;
  changePlan: (newPlan: string) => Promise<boolean>;
  cancelSubscription: () => Promise<boolean>;
  loadPaymentMethods: () => Promise<void>;
  addPaymentMethod: (paymentMethodId: string) => Promise<boolean>;
  removePaymentMethod: (methodId: string) => Promise<boolean>;
  setDefaultPaymentMethod: (methodId: string) => Promise<boolean>;
  reset: () => void;
}

export const useBillingStore = create<BillingStore>((set) => ({
  plans: [],
  billingStatus: null,
  paymentMethods: [],
  loading: false,
  error: null,

  loadPlans: async () => {
    set({ loading: true, error: null });
    try {
      const plans = await getPlans();
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
    if (!paymentMethodId) {
      set({ error: 'A payment method is required to subscribe' });
      return false;
    }
    set({ loading: true, error: null });
    try {
      await apiSubscribe(plan, paymentMethodId);
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

  loadPaymentMethods: async () => {
    try {
      const result = await apiListPaymentMethods();
      set({ paymentMethods: result.items ?? [] });
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
    }
  },

  addPaymentMethod: async (paymentMethodId) => {
    try {
      const pm = await apiAddPaymentMethod(paymentMethodId);
      set((s) => ({ paymentMethods: [...s.paymentMethods, pm] }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  removePaymentMethod: async (methodId) => {
    try {
      await apiRemovePaymentMethod(methodId);
      set((s) => {
        const remaining = s.paymentMethods.filter((m) => m.id !== methodId);
        return { paymentMethods: remaining };
      });
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  setDefaultPaymentMethod: async (methodId) => {
    try {
      await apiSetDefaultPaymentMethod(methodId);
      set((s) => ({
        paymentMethods: s.paymentMethods.map((m) => ({
          ...m,
          is_default: m.id === methodId,
        })),
      }));
      return true;
    } catch (e: unknown) {
      set({ error: extractApiError(e) });
      return false;
    }
  },

  reset: () => set({ plans: [], billingStatus: null, paymentMethods: [], loading: false, error: null }),
}));

import { create } from 'zustand';
import { billingApi } from '../api/billing';
import { extractApiError } from '../api/client';

interface BillingStore {
  plan: string;
  status: string;
  minutesIncluded: number;
  minutesUsed: number;
  minutesRemaining: number;
  paymentMethodPresent: boolean;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  paymentMethod: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  } | null;
  loading: boolean;
  error: string | null;

  fetchStatus: () => Promise<void>;
  subscribe: (plan: string) => Promise<void>;
  changePlan: (newPlan: string) => Promise<void>;
  cancelSubscription: (immediate?: boolean) => Promise<void>;
  createSetupIntent: () => Promise<string>;
  attachPaymentMethod: (paymentMethodId: string) => Promise<void>;
}

export const useBillingStore = create<BillingStore>((set) => ({
  plan: 'free',
  status: 'none',
  minutesIncluded: 0,
  minutesUsed: 0,
  minutesRemaining: 0,
  paymentMethodPresent: false,
  currentPeriodEnd: null,
  cancelAtPeriodEnd: false,
  paymentMethod: null,
  loading: false,
  error: null,

  fetchStatus: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await billingApi.getStatus();
      set({
        plan: data.plan,
        status: data.status,
        minutesIncluded: data.minutes_included,
        minutesUsed: data.minutes_used,
        minutesRemaining: data.minutes_remaining,
        paymentMethodPresent: data.payment_method_present,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        paymentMethod: data.payment_method ?? null,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  subscribe: async (plan) => {
    set({ loading: true, error: null });
    try {
      await billingApi.subscribe(plan);
      const { data } = await billingApi.getStatus();
      set({
        plan: data.plan,
        status: data.status,
        minutesIncluded: data.minutes_included,
        minutesUsed: data.minutes_used,
        minutesRemaining: data.minutes_remaining,
        paymentMethodPresent: data.payment_method_present,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        paymentMethod: data.payment_method ?? null,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  changePlan: async (newPlan) => {
    set({ loading: true, error: null });
    try {
      await billingApi.changePlan(newPlan);
      const { data } = await billingApi.getStatus();
      set({
        plan: data.plan,
        status: data.status,
        minutesIncluded: data.minutes_included,
        minutesUsed: data.minutes_used,
        minutesRemaining: data.minutes_remaining,
        paymentMethodPresent: data.payment_method_present,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        paymentMethod: data.payment_method ?? null,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  cancelSubscription: async (immediate = false) => {
    set({ loading: true, error: null });
    try {
      await billingApi.cancelSubscription(immediate);
      const { data } = await billingApi.getStatus();
      set({
        plan: data.plan,
        status: data.status,
        minutesIncluded: data.minutes_included,
        minutesUsed: data.minutes_used,
        minutesRemaining: data.minutes_remaining,
        paymentMethodPresent: data.payment_method_present,
        currentPeriodEnd: data.current_period_end,
        cancelAtPeriodEnd: data.cancel_at_period_end,
        paymentMethod: data.payment_method ?? null,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },

  createSetupIntent: async () => {
    set({ loading: true, error: null });
    try {
      const { data } = await billingApi.createSetupIntent();
      set({ loading: false });
      return data.client_secret;
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
      throw err;
    }
  },

  attachPaymentMethod: async (paymentMethodId) => {
    set({ loading: true, error: null });
    try {
      await billingApi.attachPaymentMethod(paymentMethodId);
      const { data } = await billingApi.getStatus();
      set({
        paymentMethodPresent: data.payment_method_present,
        paymentMethod: data.payment_method ?? null,
        loading: false,
      });
    } catch (err) {
      set({ loading: false, error: extractApiError(err) });
    }
  },
}));

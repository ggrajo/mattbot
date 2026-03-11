import { apiClient } from './client';

export interface BillingStatus {
  plan: string;
  status: string;
  minutes_included: number;
  minutes_used: number;
  minutes_remaining: number;
  payment_method_present: boolean;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  payment_method?: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
}

export interface SetupIntentResponse {
  client_secret: string;
}

export const billingApi = {
  getStatus: () => apiClient.get<BillingStatus>('/billing/status'),
  createSetupIntent: () =>
    apiClient.post<SetupIntentResponse>('/billing/setup-intent'),
  attachPaymentMethod: (paymentMethodId: string) =>
    apiClient.post('/billing/payment-method/attach', {
      payment_method_id: paymentMethodId,
    }),
  subscribe: (plan: string) => apiClient.post('/billing/subscribe', { plan }),
  changePlan: (newPlan: string) =>
    apiClient.post('/billing/change-plan', { new_plan: newPlan }),
  cancelSubscription: (immediate = false) =>
    apiClient.post('/billing/cancel', { immediate }),
  devSetPlan: (plan: string, status = 'active') =>
    apiClient.post('/dev/billing/set-plan', { plan, status }),
  devSimulateUsage: (minutes: number) =>
    apiClient.post('/dev/billing/simulate-usage-minutes', { minutes }),
};

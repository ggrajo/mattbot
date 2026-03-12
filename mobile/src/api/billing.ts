import { apiClient } from './client';

export interface BillingPlan {
  code: string;
  name: string;
  price_usd: string;
  included_minutes: number;
  requires_credit_card: boolean;
  limited: boolean;
  sort_order: number;
  description: string;
  icon: string;
}

export interface PaymentMethodInfo {
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
}

export interface BillingStatus {
  plan: string | null;
  status: string | null;
  minutes_included: number;
  minutes_used: number;
  minutes_remaining: number;
  minutes_carried_over?: number;
  payment_method: PaymentMethodInfo | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  has_subscription: boolean;
  auto_upgrade_enabled?: boolean;
  auto_upgrade_plan?: string | null;
}

export interface SetupIntentResult {
  client_secret: string;
  customer_id: string;
}

export interface SubscriptionResult {
  plan: string;
  status: string;
  minutes_included: number;
  minutes_carried_over?: number;
  current_period_end: string | null;
}

export interface CancelResult {
  status: string;
  cancel_at_period_end: boolean;
  current_period_end: string | null;
}

export async function getPlans(): Promise<BillingPlan[]> {
  const { data } = await apiClient.get('/billing/plans');
  return data.plans;
}

export async function getBillingStatus(): Promise<BillingStatus> {
  const { data } = await apiClient.get('/billing/status');
  return data;
}

export async function createSetupIntent(): Promise<SetupIntentResult> {
  const { data } = await apiClient.post('/billing/setup-intent');
  return data;
}

export async function subscribe(
  plan: string,
  paymentMethodId: string,
): Promise<SubscriptionResult> {
  const { data } = await apiClient.post('/billing/subscribe', {
    plan,
    payment_method_id: paymentMethodId,
  });
  return data;
}

export async function changePlan(newPlan: string): Promise<SubscriptionResult> {
  const { data } = await apiClient.post('/billing/change-plan', {
    new_plan: newPlan,
  });
  return data;
}

export async function cancelSubscription(): Promise<CancelResult> {
  const { data } = await apiClient.post('/billing/cancel');
  return data;
}

export async function devSetPlan(
  plan: string,
  status: string = 'active',
): Promise<SubscriptionResult> {
  const { data } = await apiClient.post('/dev/billing/set-plan', {
    plan,
    status,
  });
  return data;
}

export async function devSimulateUsage(
  minutes: number,
): Promise<{ minutes_used: number; upgrade_triggered: boolean }> {
  const { data } = await apiClient.post('/dev/billing/simulate-usage-minutes', {
    minutes,
  });
  return data;
}

export interface PaymentMethodItem {
  id: string;
  brand: string | null;
  last4: string | null;
  exp_month: number | null;
  exp_year: number | null;
  is_default: boolean;
}

export async function listPaymentMethods(): Promise<{ items: PaymentMethodItem[] }> {
  const { data } = await apiClient.get('/billing/payment-methods');
  return data;
}

export async function addPaymentMethod(paymentMethodId: string): Promise<PaymentMethodItem> {
  const { data } = await apiClient.post('/billing/payment-methods', { payment_method_id: paymentMethodId });
  return data;
}

export async function removePaymentMethod(methodId: string): Promise<void> {
  await apiClient.delete(`/billing/payment-methods/${methodId}`);
}

export async function setDefaultPaymentMethod(methodId: string): Promise<PaymentMethodItem> {
  const { data } = await apiClient.post(`/billing/payment-methods/${methodId}/default`);
  return data;
}

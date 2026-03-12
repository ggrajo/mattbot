import { apiClient } from './client';

export interface OnboardingState {
  current_step: string;
  steps_completed: string[];
  is_complete: boolean;
  next_step: string | null;
}

export async function getOnboarding(): Promise<OnboardingState> {
  const { data } = await apiClient.get('/onboarding');
  return data;
}

export async function completeOnboardingStep(step: string): Promise<OnboardingState> {
  const { data } = await apiClient.post('/onboarding/complete-step', { step });
  return data;
}

import { apiClient } from './client';

export interface OnboardingState {
  current_step: string;
  steps_completed: string[];
  is_complete: boolean;
  next_step: string | null;
}

export async function fetchOnboarding(): Promise<OnboardingState> {
  const { data } = await apiClient.get<OnboardingState>('/onboarding');
  return data;
}

export async function completeOnboardingStep(
  step: string,
): Promise<OnboardingState> {
  const { data } = await apiClient.post<OnboardingState>(
    '/onboarding/complete-step',
    { step },
  );
  return data;
}

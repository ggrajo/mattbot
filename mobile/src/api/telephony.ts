import { apiClient } from './client';

export interface UserNumber {
  e164: string;
  status: string;
  provisioned_at: string | null;
  twilio_number_sid: string | null;
}

export interface CallModeConfig {
  mode: string;
  forwarding_number: string | null;
  forwarding_verified: boolean;
}

export interface ForwardingGuide {
  steps: string[];
  ai_number: string | null;
}

export interface VerificationAttempt {
  attempt_id: string;
  verification_code: string;
  instructions: string;
}

export const telephonyApi = {
  provisionNumber: () => apiClient.post<UserNumber>('/numbers/provision'),
  getNumbers: () => apiClient.get<UserNumber[]>('/numbers'),
  getCallMode: () => apiClient.get<CallModeConfig>('/call-modes'),
  updateCallMode: (mode: string, forwardingNumber?: string) =>
    apiClient.patch('/call-modes', {
      mode,
      forwarding_number: forwardingNumber,
    }),
  getForwardingGuide: () =>
    apiClient.get<ForwardingGuide>('/forwarding/setup-guide'),
  startVerification: () =>
    apiClient.post<VerificationAttempt>('/forwarding/verify'),
  checkVerification: (attemptId: string) =>
    apiClient.get(`/forwarding/verify/${attemptId}`),
  completeVerification: (attemptId: string, code: string) =>
    apiClient.post(`/forwarding/verify/${attemptId}/complete`, { code }),
};

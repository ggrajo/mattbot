import { apiClient } from './client';

export interface CallResponse {
  id: string;
  from_number: string;
  to_number: string;
  direction: string;
  status: string;
  duration_seconds: number | null;
  started_at: string;
  answered_at: string | null;
  ended_at: string | null;
  ai_session_id?: string | null;
}

export interface CallListResponse {
  calls: CallResponse[];
  total: number;
}

export interface CallEventResponse {
  id: string;
  event_type: string;
  from_status: string | null;
  to_status: string;
  created_at: string;
}

export const callsApi = {
  listCalls: (params?: { status?: string; limit?: number; offset?: number }) =>
    apiClient.get<CallListResponse>('/calls', { params }),

  getCall: (callId: string) =>
    apiClient.get<CallResponse>(`/calls/${callId}`),

  getCallEvents: (callId: string) =>
    apiClient.get<CallEventResponse[]>(`/calls/${callId}/events`),
};

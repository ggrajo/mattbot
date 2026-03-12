import { apiClient } from './client';

export interface CallEvent {
  id: string;
  event_type: string;
  provider_status: string | null;
  event_at: string;
}

export interface CallLabel {
  label_name: string;
  reason_text: string;
  evidence_snippets: string[];
  confidence: number;
  produced_by: string;
}

export interface CallListItem {
  id: string;
  created_at: string;
  direction: string;
  from_masked: string;
  to_masked: string;
  status: string;
  duration_seconds: number | null;
  source_type: string;
  missing_summary: boolean;
  missing_transcript: boolean;
  missing_labels: boolean;
  started_at: string;
  artifact_status: string | null;
  caller_display_name?: string | null;
  caller_relationship?: string | null;
  is_vip?: boolean;
  is_blocked?: boolean;
  booked_calendar_event_id?: string | null;
  booked_calendar_event_summary?: string | null;
}

export interface CallListResponse {
  items: CallListItem[];
  next_cursor: string | null;
  has_more: boolean;
}

export interface CallDetail {
  id: string;
  direction: string;
  source_type: string;
  from_masked: string;
  to_masked: string;
  status: string;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  forwarding_detected: boolean;
  missing_summary: boolean;
  missing_transcript: boolean;
  missing_labels: boolean;
  events: CallEvent[];
  created_at: string;
  summary: string | null;
  summary_status: string | null;
  labels: CallLabel[] | null;
  labels_status: string | null;
  transcript_status: string | null;
  notes: string | null;
  recording_available?: boolean;
}

export interface CallArtifacts {
  call_id: string;
  summary: string | null;
  summary_status: string;
  labels: CallLabel[];
  labels_status: string;
  transcript_status: string;
  structured_extraction: Record<string, unknown> | null;
}

export interface TranscriptTurn {
  role: string;
  text: string;
  time_seconds: number;
}

export interface TranscriptResponse {
  call_id: string;
  conversation_id: string | null;
  turns: TranscriptTurn[];
  turn_count: number;
  status: string;
}

export interface CallFilters {
  label?: string;
  search?: string;
  status?: string;
  source_type?: string;
  date_from?: string;
  date_to?: string;
  duration_min?: number;
  duration_max?: number;
  country_prefix?: string;
  has_recording?: boolean;
  sort_by?: string;
  sort_dir?: string;
}

export async function fetchCalls(cursor?: string, filters?: CallFilters): Promise<CallListResponse> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  if (filters?.label) params.label = filters.label;
  if (filters?.search) params.search = filters.search;
  if (filters?.status) params.status = filters.status;
  if (filters?.source_type) params.source_type = filters.source_type;
  if (filters?.date_from) params.date_from = filters.date_from;
  if (filters?.date_to) params.date_to = filters.date_to;
  if (filters?.duration_min != null) params.duration_min = String(filters.duration_min);
  if (filters?.duration_max != null) params.duration_max = String(filters.duration_max);
  if (filters?.country_prefix) params.country_prefix = filters.country_prefix;
  if (filters?.has_recording === true) params.has_recording = 'true';
  if (filters?.sort_by) params.sort_by = filters.sort_by;
  if (filters?.sort_dir) params.sort_dir = filters.sort_dir;
  const { data } = await apiClient.get('/calls', { params });
  return data;
}

export async function fetchCallerPhone(callId: string): Promise<{ phone: string }> {
  const { data } = await apiClient.get(`/calls/${callId}/caller-phone`);
  return data;
}

export async function fetchCallDetail(callId: string): Promise<CallDetail> {
  const { data } = await apiClient.get(`/calls/${callId}`);
  return data;
}

export async function fetchCallArtifacts(callId: string): Promise<CallArtifacts> {
  const { data } = await apiClient.get(`/calls/${callId}/artifacts`);
  return data;
}

export async function fetchCallTranscript(callId: string): Promise<TranscriptResponse> {
  const { data } = await apiClient.get(`/calls/${callId}/transcript`);
  return data;
}

export async function retryCallTranscript(callId: string): Promise<{ status: string; message: string }> {
  const { data } = await apiClient.post(`/calls/${callId}/transcript/retry`);
  return data;
}

export async function patchCallNotes(callId: string, notes: string): Promise<CallDetail> {
  const { data } = await apiClient.patch(`/calls/${callId}`, { notes });
  return data;
}

export function getCallRecordingUrl(callId: string, token: string): string {
  const base = apiClient.defaults.baseURL ?? '';
  return `${base}/calls/${callId}/recording?token=${encodeURIComponent(token)}`;
}

export async function markCallVip(callId: string): Promise<void> {
  await apiClient.post(`/calls/${callId}/mark-vip`);
}

export async function unmarkCallVip(callId: string): Promise<void> {
  await apiClient.delete(`/calls/${callId}/mark-vip`);
}

export async function markCallBlocked(callId: string, reason?: string): Promise<void> {
  await apiClient.post(`/calls/${callId}/mark-blocked`, reason ? { reason } : {});
}

export async function unmarkCallBlocked(callId: string): Promise<void> {
  await apiClient.delete(`/calls/${callId}/mark-blocked`);
}

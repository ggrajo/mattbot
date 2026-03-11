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

export interface MemoryItem {
  id: string;
  memory_type: string;
  subject: string | null;
  value: string | null;
  confidence: number | null;
  user_confirmed: boolean;
  source_call_id: string | null;
  created_at: string;
}

export interface CallFilters {
  label?: string;
  search?: string;
  status?: string;
}

export async function fetchCalls(cursor?: string, filters?: CallFilters): Promise<CallListResponse> {
  const params: Record<string, string> = {};
  if (cursor) params.cursor = cursor;
  if (filters?.label) params.label = filters.label;
  if (filters?.search) params.search = filters.search;
  if (filters?.status) params.status = filters.status;
  const { data } = await apiClient.get('/calls', { params });
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

export async function fetchMemoryItems(): Promise<{ items: MemoryItem[] }> {
  const { data } = await apiClient.get('/memory');
  return data;
}

export async function deleteMemoryItem(id: string): Promise<void> {
  await apiClient.delete(`/memory/${id}`);
}

export async function deleteAllMemory(): Promise<void> {
  await apiClient.delete('/memory');
}

import { apiClient } from './client';

export interface NumberInfo {
  id: string;
  e164: string;
  status: string;
  provisioned_at: string | null;
}

export interface CallModes {
  mode_a_enabled: boolean;
  mode_b_enabled: boolean;
  access_control: string;
  verification_status: string;
}

export interface CallModesPatch {
  mode_a_enabled?: boolean;
  mode_b_enabled?: boolean;
  access_control?: string;
  personal_number_e164?: string;
}

export interface CarrierGuide {
  carrier: string;
  enable_busy: string;
  enable_unreachable: string;
  disable: string;
}

export interface ForwardingGuide {
  generic_instructions: string[];
  carrier_guides: CarrierGuide[];
}

export interface VerificationResult {
  attempt_id: string;
  status: string;
  message: string;
}

export interface VerificationStatus {
  verification_status: string;
  last_verified_at: string | null;
  latest_attempt_status: string | null;
}

export async function provisionNumber(): Promise<NumberInfo> {
  const { data } = await apiClient.post('/numbers/provision');
  return data;
}

export async function listNumbers(): Promise<NumberInfo[]> {
  const { data } = await apiClient.get('/numbers');
  return data?.items ?? data ?? [];
}

export async function getCallModes(): Promise<CallModes> {
  const { data } = await apiClient.get('/call-modes');
  return data;
}

export async function patchCallModes(changes: CallModesPatch): Promise<CallModes> {
  const { data } = await apiClient.patch('/call-modes', changes);
  return data;
}

export async function getForwardingGuide(): Promise<ForwardingGuide> {
  const { data } = await apiClient.get('/forwarding/setup-guide');
  return data;
}

export async function startForwardingVerification(): Promise<VerificationResult> {
  const { data } = await apiClient.post('/forwarding/verify');
  return data;
}

export async function getForwardingVerificationStatus(): Promise<VerificationStatus> {
  const { data } = await apiClient.get('/forwarding/verify/status');
  return data;
}

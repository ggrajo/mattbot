import { apiClient } from './client';

export interface UserSettings {
  theme_preference: string;
  notification_privacy_mode: string;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string | null;
  quiet_hours_end: string | null;
  quiet_hours_days: number[];
  quiet_hours_intervals: QuietHoursInterval[];
  quiet_hours_allow_vip: boolean;
  timezone: string;
  personal_phone_last4: string | null;
  memory_enabled: boolean;
  data_retention_days: number;
  biometric_unlock_enabled: boolean;
  recording_enabled: boolean;
  call_objective_mode: string;
  max_call_length_seconds: number;
  vip_max_call_length_seconds: number;
  handoff_enabled: boolean;
  handoff_trigger: string;
  handoff_offer_timeout_seconds: number;
  handoff_target_phone_last4: string | null;
  business_hours_enabled: boolean;
  business_hours_start: string | null;
  business_hours_end: string | null;
  business_hours_days: number[];
  after_hours_behavior: string;
  temperament_preset: string;
  swearing_rule: string;
  language_primary: string;
  language_secondary: string | null;
  vip_calls_mark_important: boolean;
  vip_notification_intensity: string;
  blocked_caller_behavior: string;
  log_blocked_attempts: boolean;
  notify_on_blocked: boolean;
  spam_labeling_enabled: boolean;
  block_suggestions_enabled: boolean;
  repeat_caller_threshold: number;
  text_approval_mode: string;
  assistant_name: string;
  greeting_template: string;
  transcript_disclosure_mode: string;
  recording_announcement_required: boolean;
  important_rule: string;
  biometric_policy: string;
  calendar_booking_enabled: boolean;
  calendar_default_duration_minutes: number;
  calendar_booking_window_days: number;
  urgent_notify_sms: boolean;
  urgent_notify_email: boolean;
  urgent_notify_call: boolean;
  urgent_notify_phone_last4: string | null;
  urgent_notify_email_address: string | null;
  revision: number;
}

export interface QuietHoursInterval {
  label: string;
  start: string;
  end: string;
  days: number[];
}

export interface SettingsChanges {
  [key: string]: unknown;
  personal_phone?: string;
  handoff_target_phone?: string;
  urgent_notify_phone?: string;
}

export interface SettingsPatchResponse {
  revision: number;
  settings: UserSettings;
}

export async function fetchSettings(): Promise<UserSettings> {
  const { data } = await apiClient.get<UserSettings>('/settings');
  return data;
}

export async function patchSettings(
  expectedRevision: number,
  changes: Record<string, unknown>,
): Promise<SettingsPatchResponse> {
  const { data } = await apiClient.patch<SettingsPatchResponse>('/settings', {
    expected_revision: expectedRevision,
    changes,
  });
  return data;
}

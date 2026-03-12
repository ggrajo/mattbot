import { apiClient } from './client';

export interface Reminder {
  id: string;
  call_id: string | null;
  title: string;
  due_at: string;
  timezone_at_creation: string | null;
  status: string;
  created_at: string;
  call_from_masked: string | null;
}

export interface ReminderCreateParams {
  title: string;
  due_at: string;
  timezone?: string;
}

export interface ReminderUpdateParams {
  title?: string;
  due_at?: string;
}

export async function listReminders(): Promise<{ items: Reminder[] }> {
  const { data } = await apiClient.get('/reminders');
  return data;
}

export async function createReminder(
  callId: string,
  params: ReminderCreateParams,
): Promise<Reminder> {
  const { data } = await apiClient.post(`/reminders/calls/${callId}`, params);
  return data;
}

export async function updateReminder(
  reminderId: string,
  params: ReminderUpdateParams,
): Promise<Reminder> {
  const { data } = await apiClient.patch(`/reminders/${reminderId}`, params);
  return data;
}

export async function completeReminder(reminderId: string): Promise<Reminder> {
  const { data } = await apiClient.post(`/reminders/${reminderId}/complete`);
  return data;
}

export async function cancelReminder(reminderId: string): Promise<Reminder> {
  const { data } = await apiClient.post(`/reminders/${reminderId}/cancel`);
  return data;
}

export async function deleteReminder(reminderId: string): Promise<void> {
  await apiClient.delete(`/reminders/${reminderId}`);
}

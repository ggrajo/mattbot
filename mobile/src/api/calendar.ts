import { apiClient } from './client';

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description?: string;
  location?: string;
  status: string;
  is_mattbot_booked: boolean;
  caller_name: string | null;
  caller_phone: string | null;
  call_id: string | null;
}

export interface CalendarStatus {
  connected: boolean;
  email: string | null;
  calendar_id: string | null;
  needs_reauth?: boolean;
}

export interface AvailableSlot {
  start: string;
  end: string;
}

export async function getCalendarAuthUrl(): Promise<{ auth_url: string }> {
  const { data } = await apiClient.get('/calendar/auth-url');
  return data;
}

export async function getCalendarStatus(): Promise<CalendarStatus> {
  const { data } = await apiClient.get('/calendar/status');
  return data;
}

export async function disconnectCalendar(): Promise<void> {
  await apiClient.delete('/calendar/disconnect');
}

export async function getCalendarEvents(
  start: string,
  end: string,
): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get('/calendar/events', {
    params: { start, end },
  });
  return data.events ?? data.items ?? [];
}

export async function getAvailableSlots(
  date: string,
): Promise<AvailableSlot[]> {
  const { data } = await apiClient.get('/calendar/available-slots', {
    params: { date },
  });
  return data.slots ?? data.items ?? [];
}

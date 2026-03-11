import { apiClient } from './client';

export interface CalendarStatus {
  connected: boolean;
  email: string | null;
  calendar_id: string | null;
}

export interface CalendarEvent {
  id: string;
  summary: string;
  start: string;
  end: string;
  description: string | null;
  location: string | null;
  attendees: string[];
}

export interface AvailableSlot {
  start: string;
  end: string;
}

export interface CalendarAuthUrlResponse {
  auth_url: string;
}

export async function getCalendarAuthUrl(): Promise<CalendarAuthUrlResponse> {
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

export async function fetchCalendarEvents(daysAhead: number = 7): Promise<CalendarEvent[]> {
  const { data } = await apiClient.get('/calendar/events', {
    params: { days_ahead: daysAhead },
  });
  return data?.events ?? data ?? [];
}

export async function fetchAvailableSlots(
  date: string,
  durationMinutes: number = 30,
): Promise<AvailableSlot[]> {
  const { data } = await apiClient.get('/calendar/available-slots', {
    params: { date, duration_minutes: durationMinutes },
  });
  return data?.slots ?? data ?? [];
}

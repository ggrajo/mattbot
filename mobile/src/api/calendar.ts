import { apiClient } from './client';

export interface CalendarStatus {
  is_connected: boolean;
  calendar_id: string | null;
}

export interface AvailabilitySlot {
  start_time: string;
  end_time: string;
}

export interface AvailabilityResponse {
  date: string;
  slots: AvailabilitySlot[];
}

export interface BookingRequest {
  title: string;
  start_time: string;
  end_time: string;
  attendee_email?: string;
}

export interface BookingResponse {
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  link: string | null;
}

export interface CalendarEvent {
  event_id: string;
  title: string;
  start_time: string;
  end_time: string;
  attendees: string[];
}

export const calendarApi = {
  getStatus: () => apiClient.get<CalendarStatus>('/calendar/status'),
  connect: (authCode: string) =>
    apiClient.post<CalendarStatus>('/calendar/connect', { auth_code: authCode }),
  disconnect: () => apiClient.post('/calendar/disconnect'),
  getAvailability: (date: string, durationMinutes?: number) =>
    apiClient.get<AvailabilityResponse>('/calendar/availability', {
      params: { date, duration_minutes: durationMinutes },
    }),
  book: (data: BookingRequest) =>
    apiClient.post<BookingResponse>('/calendar/book', data),
  getEvents: (limit?: number) =>
    apiClient.get<CalendarEvent[]>('/calendar/events', {
      params: { limit },
    }),
};

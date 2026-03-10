"""Pydantic schemas for Google Calendar API endpoints."""

from __future__ import annotations

from pydantic import BaseModel


class CalendarAuthUrlResponse(BaseModel):
    auth_url: str


class CalendarStatusResponse(BaseModel):
    connected: bool
    email: str | None = None
    calendar_id: str | None = None


class CalendarEvent(BaseModel):
    id: str
    summary: str
    start: str
    end: str
    description: str = ""
    location: str = ""
    status: str = "confirmed"
    call_id: str | None = None
    is_mattbot_booked: bool = False
    caller_name: str | None = None
    caller_phone: str | None = None
    organizer_email: str = ""
    attendees_count: int = 0


class CalendarEventsResponse(BaseModel):
    events: list[CalendarEvent]
    timezone: str = "UTC"


class AvailableSlot(BaseModel):
    start: str
    end: str


class AvailableSlotsResponse(BaseModel):
    date: str
    slots: list[AvailableSlot]

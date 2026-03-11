from datetime import datetime

from pydantic import BaseModel


class CalendarStatusResponse(BaseModel):
    is_connected: bool
    calendar_id: str | None = None


class CalendarConnectRequest(BaseModel):
    auth_code: str


class AvailabilitySlot(BaseModel):
    start_time: datetime
    end_time: datetime


class AvailabilityResponse(BaseModel):
    date: str
    slots: list[AvailabilitySlot]


class BookingRequest(BaseModel):
    title: str
    start_time: datetime
    end_time: datetime
    attendee_email: str | None = None


class BookingResponse(BaseModel):
    event_id: str
    title: str
    start_time: datetime
    end_time: datetime
    link: str | None = None


class CalendarEventResponse(BaseModel):
    event_id: str
    title: str
    start_time: datetime
    end_time: datetime
    attendees: list[str] = []

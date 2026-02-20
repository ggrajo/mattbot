import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AuditEvent


async def log_event(
    db: AsyncSession,
    *,
    owner_user_id: uuid.UUID,
    event_type: str,
    actor_type: str = "user",
    actor_id: uuid.UUID | None = None,
    target_type: str | None = None,
    target_id: uuid.UUID | None = None,
    ip: str | None = None,
    user_agent: str | None = None,
    details: dict | None = None,
) -> AuditEvent:
    event = AuditEvent(
        owner_user_id=owner_user_id,
        actor_type=actor_type,
        actor_id=actor_id,
        event_type=event_type,
        target_type=target_type,
        target_id=target_id,
        ip=ip,
        user_agent=user_agent,
        details=details,
    )
    db.add(event)
    return event

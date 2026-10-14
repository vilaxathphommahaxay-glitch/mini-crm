from datetime import date, datetime

from app.models import ActivityType
from app.schemas.common import (
    ContactRef,
    DealRef,
    InputModel,
    OptionalText,
    OutputModel,
    UserRef,
    short_text,
)


class ActivityCreate(InputModel):
    type: ActivityType
    subject: short_text(200)
    description: OptionalText = None
    due_date: date | None = None
    done: bool = False
    contact_id: int | None = None
    deal_id: int | None = None
    owner_id: int | None = None


class ActivityUpdate(InputModel):
    type: ActivityType | None = None
    subject: short_text(200) | None = None
    description: OptionalText = None
    due_date: date | None = None
    done: bool | None = None
    contact_id: int | None = None
    deal_id: int | None = None
    owner_id: int | None = None


class ActivityOut(OutputModel):
    id: int
    type: ActivityType
    subject: str
    description: str | None
    due_date: date | None
    done: bool
    completed_at: datetime | None
    contact: ContactRef | None
    deal: DealRef | None
    owner: UserRef
    created_at: datetime
    updated_at: datetime


class Reminders(OutputModel):
    overdue: int
    today: int

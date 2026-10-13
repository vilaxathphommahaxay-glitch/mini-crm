from datetime import datetime

from app.schemas.common import (
    InputModel,
    OptionalText,
    OutputModel,
    UserRef,
    optional_text,
    short_text,
)


class CompanyCreate(InputModel):
    name: short_text(200)
    phone: optional_text(50) = None
    address: OptionalText = None
    website: optional_text(255) = None
    notes: OptionalText = None
    owner_id: int | None = None


class CompanyUpdate(InputModel):
    name: short_text(200) | None = None
    phone: optional_text(50) = None
    address: OptionalText = None
    website: optional_text(255) = None
    notes: OptionalText = None
    owner_id: int | None = None


class CompanyOut(OutputModel):
    id: int
    name: str
    phone: str | None
    address: str | None
    website: str | None
    notes: str | None
    owner: UserRef
    created_at: datetime
    updated_at: datetime

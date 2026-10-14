from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, Field

from app.schemas.common import (
    CompanyRef,
    InputModel,
    OptionalEmail,
    OptionalText,
    OutputModel,
    UserRef,
    optional_text,
    short_text,
)


def normalize_tags(tags: list[str]) -> list[str]:
    """Trim, lowercase, drop blanks and duplicates, keep order."""
    seen: dict[str, None] = {}
    for tag in tags:
        name = tag.strip().lower()
        if name:
            if len(name) > 50:
                raise ValueError("Tags can be at most 50 characters")
            seen[name] = None
    return list(seen)


Tags = Annotated[list[str], Field(max_length=20), AfterValidator(normalize_tags)]


class ContactCreate(InputModel):
    first_name: short_text(100)
    last_name: optional_text(100) = None
    email: OptionalEmail = None
    phone: optional_text(50) = None
    notes: OptionalText = None
    company_id: int | None = None
    # alternative to company_id: use the visible company with this name, or create it
    company_name: optional_text(200) = None
    tags: Tags = []
    owner_id: int | None = None


class ContactUpdate(InputModel):
    first_name: short_text(100) | None = None
    last_name: optional_text(100) = None
    email: OptionalEmail = None
    phone: optional_text(50) = None
    notes: OptionalText = None
    company_id: int | None = None
    company_name: optional_text(200) = None
    tags: Tags | None = None
    owner_id: int | None = None


class ContactOut(OutputModel):
    id: int
    first_name: str
    last_name: str | None
    full_name: str
    email: str | None
    phone: str | None
    notes: str | None
    company: CompanyRef | None
    tags: list[str] = Field(validation_alias="tag_names")
    owner: UserRef
    created_at: datetime
    updated_at: datetime


class ImportRowError(OutputModel):
    row: int
    message: str


class ImportResult(OutputModel):
    created: int
    skipped: int
    companies_created: int
    errors: list[ImportRowError]

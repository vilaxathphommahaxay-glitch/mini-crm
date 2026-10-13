from typing import Annotated

from pydantic import AfterValidator, BaseModel, BeforeValidator, ConfigDict, EmailStr, Field


def _blank_to_none(value):
    """Treat "" and whitespace-only strings as "not provided" for optional fields."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _strip(value):
    return value.strip() if isinstance(value, str) else value


def _lower(value: str | None) -> str | None:
    return value.lower() if value else value


Text = Annotated[str, BeforeValidator(_strip)]
OptionalText = Annotated[str | None, BeforeValidator(_blank_to_none)]
OptionalEmail = Annotated[EmailStr | None, BeforeValidator(_blank_to_none), AfterValidator(_lower)]


def short_text(max_length: int):
    return Annotated[Text, Field(min_length=1, max_length=max_length)]


def optional_text(max_length: int):
    # the length limit must sit on the str branch, not on the `| None` union
    return Annotated[
        Annotated[str, Field(max_length=max_length)] | None, BeforeValidator(_blank_to_none)
    ]


class InputModel(BaseModel):
    """Base for request bodies: unknown fields are rejected instead of silently ignored."""

    model_config = ConfigDict(extra="forbid")


class OutputModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserRef(OutputModel):
    id: int
    name: str


class CompanyRef(OutputModel):
    id: int
    name: str


class ContactRef(OutputModel):
    id: int
    name: str = Field(validation_alias="full_name")


class DealRef(OutputModel):
    id: int
    title: str

from typing import Annotated

from pydantic import BaseModel, BeforeValidator, ConfigDict


def _blank_to_none(value):
    """Treat "" and whitespace-only strings as "not provided" for optional text fields."""
    if isinstance(value, str):
        value = value.strip()
        return value or None
    return value


def _strip(value):
    return value.strip() if isinstance(value, str) else value


OptionalText = Annotated[str | None, BeforeValidator(_blank_to_none)]
Text = Annotated[str, BeforeValidator(_strip)]


class InputModel(BaseModel):
    """Base for request bodies: unknown fields are rejected instead of silently ignored."""

    model_config = ConfigDict(extra="forbid")


class OutputModel(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class UserRef(OutputModel):
    id: int
    name: str

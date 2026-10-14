from datetime import datetime
from typing import Annotated

from pydantic import AfterValidator, EmailStr, Field

from app.models import Role
from app.schemas.common import InputModel, OutputModel, Text


def _fits_bcrypt(value: str) -> str:
    # bcrypt rejects more than 72 bytes; one Lao/Thai character is 3 bytes in UTF-8.
    if len(value.encode()) > 72:
        raise ValueError("Password is too long")
    return value


Email = Annotated[EmailStr, AfterValidator(str.lower)]
Password = Annotated[str, Field(min_length=8), AfterValidator(_fits_bcrypt)]
Name = Annotated[Text, Field(min_length=1, max_length=100)]


class UserOut(OutputModel):
    id: int
    name: str
    email: str
    role: Role
    is_active: bool
    created_at: datetime


class UserCreate(InputModel):
    name: Name
    email: Email
    password: Password
    role: Role = Role.staff


class UserUpdate(InputModel):
    name: Name | None = None
    email: Email | None = None
    password: Password | None = None
    role: Role | None = None
    is_active: bool | None = None


class LoginIn(InputModel):
    email: Email
    password: str


class TokenOut(OutputModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class ChangePasswordIn(InputModel):
    current_password: str
    new_password: Password


class TransferIn(InputModel):
    to_user_id: int


class TransferOut(OutputModel):
    companies: int
    contacts: int
    deals: int
    activities: int

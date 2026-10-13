from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import Field, PlainSerializer

from app.models import Currency, Stage
from app.schemas.common import (
    CompanyRef,
    ContactRef,
    InputModel,
    OutputModel,
    UserRef,
    short_text,
)

MoneyIn = Annotated[Decimal, Field(ge=0, max_digits=18, decimal_places=2)]
# Money goes over the wire as a string with two decimals, e.g. "1500000.00".
Money = Annotated[Decimal, PlainSerializer(lambda d: f"{d:.2f}", return_type=str)]


class DealCreate(InputModel):
    title: short_text(200)
    value: MoneyIn
    currency: Currency = Currency.LAK
    stage: Stage = Stage.lead
    contact_id: int
    company_id: int | None = None
    expected_close_date: date | None = None
    owner_id: int | None = None


class DealUpdate(InputModel):
    """Stage and position are changed only through PATCH /deals/{id}/move."""

    title: short_text(200) | None = None
    value: MoneyIn | None = None
    currency: Currency | None = None
    contact_id: int | None = None
    company_id: int | None = None
    expected_close_date: date | None = None
    owner_id: int | None = None


class DealMove(InputModel):
    stage: Stage
    before_id: int | None = None


class DealOut(OutputModel):
    id: int
    title: str
    value: Money
    currency: Currency
    stage: Stage
    position: int
    contact: ContactRef
    company: CompanyRef | None
    owner: UserRef
    expected_close_date: date | None
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime


class CurrencyTotal(OutputModel):
    currency: Currency
    amount: Money


class BoardColumn(OutputModel):
    stage: Stage
    count: int
    totals: list[CurrencyTotal]
    deals: list[DealOut]

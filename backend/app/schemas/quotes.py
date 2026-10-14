from datetime import date, datetime
from decimal import Decimal
from typing import Annotated

from pydantic import Field

from app.models import Currency
from app.schemas.common import (
    DealRef,
    InputModel,
    OptionalText,
    OutputModel,
    UserRef,
    optional_text,
    short_text,
)
from app.schemas.deals import Money, MoneyIn

Quantity = Annotated[Decimal, Field(gt=0, max_digits=12, decimal_places=2)]
Percent = Annotated[Decimal, Field(ge=0, le=100, max_digits=5, decimal_places=2)]


class QuoteItemIn(InputModel):
    description: short_text(500)
    quantity: Quantity
    unit_price: MoneyIn


class QuoteIn(InputModel):
    """Create and update take the whole quote: the item list replaces the old one."""

    issue_date: date | None = None  # default: today
    valid_until: date | None = None
    discount: MoneyIn = Decimal(0)
    tax_rate: Percent = Decimal(0)
    notes: OptionalText = None
    items: list[QuoteItemIn] = Field(min_length=1, max_length=100)


class QuoteItemOut(OutputModel):
    id: int
    description: str
    quantity: Money
    unit_price: Money
    amount: Money


class Customer(OutputModel):
    """Who the quote is for, as printed on it (taken live from the deal)."""

    name: str
    phone: str | None
    email: str | None
    company_name: str | None
    company_address: str | None
    company_phone: str | None


class QuoteSummary(OutputModel):
    id: int
    number: str
    currency: Currency
    issue_date: date
    valid_until: date | None
    total: Money
    created_at: datetime


class QuoteOut(QuoteSummary):
    deal: DealRef
    customer: Customer
    prepared_by: UserRef
    discount: Money
    tax_rate: Money
    notes: str | None
    items: list[QuoteItemOut]
    subtotal: Money
    tax: Money
    updated_at: datetime


class BusinessProfileIn(InputModel):
    name: optional_text(200) = None
    address: optional_text(1000) = None
    phone: optional_text(50) = None
    email: optional_text(255) = None
    tax_id: optional_text(50) = None
    quote_terms: optional_text(2000) = None


class BusinessProfileOut(OutputModel):
    name: str | None = None
    address: str | None = None
    phone: str | None = None
    email: str | None = None
    tax_id: str | None = None
    quote_terms: str | None = None

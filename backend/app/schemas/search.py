from app.models import Currency, Stage
from app.schemas.common import CompanyRef, ContactRef, OutputModel
from app.schemas.deals import Money


class ContactHit(OutputModel):
    id: int
    full_name: str
    email: str | None
    company: CompanyRef | None


class CompanyHit(OutputModel):
    id: int
    name: str
    phone: str | None


class DealHit(OutputModel):
    id: int
    title: str
    stage: Stage
    value: Money
    currency: Currency
    contact: ContactRef


class SearchResults(OutputModel):
    contacts: list[ContactHit]
    companies: list[CompanyHit]
    deals: list[DealHit]

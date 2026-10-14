from datetime import timedelta

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, joinedload, selectinload

from app.access import get_owned
from app.clock import local_today, utcnow
from app.deps import AdminUser, CurrentUser, DbSession
from app.errors import field_error, not_found
from app.models import BusinessProfile, Deal, Quote, QuoteCounter, QuoteItem, User
from app.schemas.quotes import (
    BusinessProfileIn,
    BusinessProfileOut,
    QuoteIn,
    QuoteOut,
    QuoteSummary,
)

router = APIRouter(tags=["quotes"])

DEFAULT_VALID_DAYS = 30
_LOAD = (
    selectinload(Quote.items),
    joinedload(Quote.deal).options(
        joinedload(Deal.contact), joinedload(Deal.company), joinedload(Deal.owner)
    ),
)


def _get_quote(db: Session, quote_id: int, user: User) -> Quote:
    """Quotes have no owner of their own: whoever may see the deal may see its quotes."""
    quote = db.scalar(select(Quote).options(*_LOAD).where(Quote.id == quote_id))
    if quote is None:
        raise not_found("Quote")
    get_owned(db, Deal, quote.deal_id, user)  # 404 when the deal isn't yours
    return quote


def _out(quote: Quote) -> QuoteOut:
    deal = quote.deal
    contact, company = deal.contact, deal.company
    customer = {
        "name": contact.full_name,
        "phone": contact.phone,
        "email": contact.email,
        "company_name": company.name if company else None,
        "company_address": company.address if company else None,
        "company_phone": company.phone if company else None,
    }
    data = QuoteSummary.model_validate(quote).model_dump()
    return QuoteOut.model_validate(
        {
            **data,
            "deal": deal,
            "customer": customer,
            "prepared_by": deal.owner,
            "discount": quote.discount,
            "tax_rate": quote.tax_rate,
            "notes": quote.notes,
            "items": quote.items,
            "subtotal": quote.subtotal,
            "tax": quote.tax,
            "updated_at": quote.updated_at,
        }
    )


def _apply(quote: Quote, body: QuoteIn) -> None:
    quote.issue_date = body.issue_date or quote.issue_date or local_today()
    quote.valid_until = body.valid_until
    if quote.valid_until is not None and quote.valid_until < quote.issue_date:
        raise field_error(
            "valid_until", "Cannot be before the issue date", code="before_issue_date"
        )
    quote.discount = body.discount
    quote.tax_rate = body.tax_rate
    quote.notes = body.notes
    quote.items = [QuoteItem(position=i, **item.model_dump()) for i, item in enumerate(body.items)]
    if quote.discount > quote.subtotal:
        raise field_error(
            "discount", "Discount is larger than the subtotal", code="discount_too_large"
        )


def _next_number(db: Session, year: int) -> str:
    """Q-2026-0001, Q-2026-0002, ... per year; numbers of deleted quotes are not reused."""
    counter = db.get(QuoteCounter, year, with_for_update=True)
    if counter is None:
        counter = QuoteCounter(year=year, last=0)
        db.add(counter)
    counter.last += 1
    return f"Q-{year}-{counter.last:04d}"


@router.get("/deals/{deal_id}/quotes", response_model=list[QuoteSummary])
def list_quotes(deal_id: int, user: CurrentUser, db: DbSession):
    get_owned(db, Deal, deal_id, user)
    stmt = (
        select(Quote)
        .options(selectinload(Quote.items))
        .where(Quote.deal_id == deal_id)
        .order_by(Quote.created_at.desc(), Quote.id.desc())
    )
    return db.scalars(stmt).all()


@router.post("/deals/{deal_id}/quotes", response_model=QuoteOut, status_code=201)
def create_quote(deal_id: int, body: QuoteIn, user: CurrentUser, db: DbSession):
    deal = get_owned(db, Deal, deal_id, user)
    if "valid_until" not in body.model_fields_set:  # sent as null = no expiry date
        body.valid_until = (body.issue_date or local_today()) + timedelta(days=DEFAULT_VALID_DAYS)
    # Two people starting a new year's numbering at the same moment both try to create the
    # counter; the loser hits the primary key and simply tries again.
    for attempt in range(5):
        quote = Quote(deal_id=deal.id, currency=deal.currency)
        _apply(quote, body)
        quote.number = _next_number(db, quote.issue_date.year)
        db.add(quote)
        try:
            db.commit()
            break
        except IntegrityError:
            db.rollback()
            if attempt == 4:
                raise
    return _out(_get_quote(db, quote.id, user))


@router.get("/quotes/{quote_id}", response_model=QuoteOut)
def get_quote(quote_id: int, user: CurrentUser, db: DbSession):
    return _out(_get_quote(db, quote_id, user))


@router.put("/quotes/{quote_id}", response_model=QuoteOut)
def update_quote(quote_id: int, body: QuoteIn, user: CurrentUser, db: DbSession):
    quote = _get_quote(db, quote_id, user)
    _apply(quote, body)
    quote.updated_at = utcnow()
    db.commit()
    db.expire_all()
    return _out(_get_quote(db, quote_id, user))


@router.delete("/quotes/{quote_id}", status_code=204)
def delete_quote(quote_id: int, user: CurrentUser, db: DbSession):
    db.delete(_get_quote(db, quote_id, user))
    db.commit()


@router.get("/settings/business", response_model=BusinessProfileOut)
def get_business(_: CurrentUser, db: DbSession):
    return db.get(BusinessProfile, 1) or BusinessProfileOut()


@router.put("/settings/business", response_model=BusinessProfileOut)
def update_business(body: BusinessProfileIn, _: AdminUser, db: DbSession):
    profile = db.get(BusinessProfile, 1)
    if profile is None:
        profile = BusinessProfile(id=1)
        db.add(profile)
    for field, value in body.model_dump().items():
        setattr(profile, field, value)
    db.commit()
    return profile

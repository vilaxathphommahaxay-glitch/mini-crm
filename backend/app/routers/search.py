from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import joinedload

from app.access import scope
from app.deps import CurrentUser, DbSession
from app.models import Company, Contact, Deal
from app.routers.contacts import contact_query
from app.schemas.search import SearchResults

router = APIRouter(prefix="/search", tags=["search"])


@router.get("", response_model=SearchResults)
def search(
    user: CurrentUser,
    db: DbSession,
    q: Annotated[str, Query(max_length=100)] = "",
    limit: Annotated[int, Query(ge=1, le=20)] = 5,
):
    """Quick search across contacts, companies and deals the user can see (Ctrl+K)."""
    terms = q.split()
    if not terms:
        return {"contacts": [], "companies": [], "deals": []}

    contacts = db.scalars(contact_query(user, search=q).limit(limit)).unique().all()

    companies_stmt = scope(select(Company), Company, user)
    deals_stmt = scope(
        select(Deal).join(Deal.contact).options(joinedload(Deal.contact)), Deal, user
    )
    # every word must match somewhere, like the contacts list search
    for term in terms:
        pattern = f"%{term}%"
        companies_stmt = companies_stmt.where(
            or_(Company.name.ilike(pattern), Company.phone.ilike(pattern))
        )
        deals_stmt = deals_stmt.where(
            or_(
                Deal.title.ilike(pattern),
                Contact.first_name.ilike(pattern),
                Contact.last_name.ilike(pattern),
            )
        )
    companies = db.scalars(companies_stmt.order_by(Company.name).limit(limit)).all()
    deals = db.scalars(deals_stmt.order_by(Deal.updated_at.desc()).limit(limit)).all()
    return {"contacts": contacts, "companies": companies, "deals": deals}

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import func, or_, select
from sqlalchemy.orm import joinedload

from app.access import apply_patch, get_owned, resolve_owner, scope
from app.clock import utcnow
from app.deps import CurrentUser, DbSession
from app.errors import AppError
from app.models import Company, Contact, Deal
from app.pagination import Page, Pagination, paginate
from app.schemas.companies import CompanyCreate, CompanyOut, CompanyUpdate

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=Page[CompanyOut])
def list_companies(
    user: CurrentUser,
    db: DbSession,
    pagination: Pagination,
    search: Annotated[str | None, Query(max_length=100)] = None,
    owner_id: int | None = None,
):
    stmt = select(Company).options(joinedload(Company.owner))
    stmt = scope(stmt, Company, user, owner_id)
    if search and search.strip():
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(or_(Company.name.ilike(pattern), Company.phone.ilike(pattern)))
    stmt = stmt.order_by(Company.updated_at.desc(), Company.id.desc())
    return paginate(db, stmt, pagination)


@router.post("", response_model=CompanyOut, status_code=201)
def create_company(body: CompanyCreate, user: CurrentUser, db: DbSession):
    data = body.model_dump(exclude={"owner_id"})
    company = Company(**data, owner_id=resolve_owner(db, user, body.owner_id))
    db.add(company)
    db.commit()
    return company


@router.get("/{company_id}", response_model=CompanyOut)
def get_company(company_id: int, user: CurrentUser, db: DbSession):
    return get_owned(db, Company, company_id, user)


@router.patch("/{company_id}", response_model=CompanyOut)
def update_company(company_id: int, body: CompanyUpdate, user: CurrentUser, db: DbSession):
    company = get_owned(db, Company, company_id, user)
    changes = body.model_dump(exclude_unset=True)
    if "owner_id" in changes:
        changes["owner_id"] = resolve_owner(db, user, changes["owner_id"], company.owner_id)
    apply_patch(company, changes, required={"name"})
    company.updated_at = utcnow()
    db.commit()
    return company


@router.delete("/{company_id}", status_code=204)
def delete_company(company_id: int, user: CurrentUser, db: DbSession):
    company = get_owned(db, Company, company_id, user)
    contacts = db.scalar(select(func.count()).where(Contact.company_id == company.id))
    deals = db.scalar(select(func.count()).where(Deal.company_id == company.id))
    if contacts or deals:
        raise AppError(
            409,
            f"This company still has {contacts} contact(s) and {deals} deal(s). "
            "Move or delete them first.",
            code="has_related_records",
            details=[{"contacts": contacts, "deals": deals}],
        )
    db.delete(company)
    db.commit()

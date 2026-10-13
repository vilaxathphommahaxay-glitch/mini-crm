from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.access import apply_patch, get_owned, get_referenced, resolve_owner, scope
from app.clock import utcnow
from app.deps import CurrentUser, DbSession
from app.errors import AppError
from app.models import Activity, Company, Contact, Deal, Tag, User
from app.pagination import Page, Pagination, paginate
from app.schemas.contacts import ContactCreate, ContactOut, ContactUpdate

router = APIRouter(prefix="/contacts", tags=["contacts"])


def get_or_create_tags(db: Session, names: list[str]) -> list[Tag]:
    if not names:
        return []
    existing = {t.name: t for t in db.scalars(select(Tag).where(Tag.name.in_(names)))}
    tags = []
    for name in names:
        tag = existing.get(name)
        if tag is None:
            tag = Tag(name=name)
            db.add(tag)
        tags.append(tag)
    return tags


def contact_query(
    user: User,
    search: str | None = None,
    tag: str | None = None,
    company_id: int | None = None,
    owner_id: int | None = None,
):
    """Visible contacts with the list filters applied (shared by list and CSV export)."""
    stmt = (
        select(Contact)
        .outerjoin(Contact.company)
        .options(
            joinedload(Contact.company),
            joinedload(Contact.owner),
            selectinload(Contact.tags),
        )
    )
    stmt = scope(stmt, Contact, user, owner_id)
    # Every word must match somewhere, so "somchai mekong" finds Somchai at Mekong Trading.
    for term in (search or "").split():
        pattern = f"%{term}%"
        stmt = stmt.where(
            or_(
                Contact.first_name.ilike(pattern),
                Contact.last_name.ilike(pattern),
                Contact.email.ilike(pattern),
                Contact.phone.ilike(pattern),
                Company.name.ilike(pattern),
            )
        )
    if tag and tag.strip():
        stmt = stmt.where(Contact.tags.any(Tag.name == tag.strip().lower()))
    if company_id is not None:
        stmt = stmt.where(Contact.company_id == company_id)
    return stmt.order_by(Contact.updated_at.desc(), Contact.id.desc())


@router.get("", response_model=Page[ContactOut])
def list_contacts(
    user: CurrentUser,
    db: DbSession,
    pagination: Pagination,
    search: Annotated[str | None, Query(max_length=100)] = None,
    tag: str | None = None,
    company_id: int | None = None,
    owner_id: int | None = None,
):
    stmt = contact_query(user, search, tag, company_id, owner_id)
    return paginate(db, stmt, pagination)


@router.post("", response_model=ContactOut, status_code=201)
def create_contact(body: ContactCreate, user: CurrentUser, db: DbSession):
    if body.company_id is not None:
        get_referenced(db, Company, body.company_id, user, "company_id")
    contact = Contact(
        **body.model_dump(exclude={"owner_id", "tags"}),
        owner_id=resolve_owner(db, user, body.owner_id),
        tags=get_or_create_tags(db, body.tags),
    )
    db.add(contact)
    db.commit()
    return contact


@router.get("/{contact_id}", response_model=ContactOut)
def get_contact(contact_id: int, user: CurrentUser, db: DbSession):
    return get_owned(db, Contact, contact_id, user)


@router.patch("/{contact_id}", response_model=ContactOut)
def update_contact(contact_id: int, body: ContactUpdate, user: CurrentUser, db: DbSession):
    contact = get_owned(db, Contact, contact_id, user)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("company_id") is not None:
        get_referenced(db, Company, changes["company_id"], user, "company_id")
    if "owner_id" in changes:
        changes["owner_id"] = resolve_owner(db, user, changes["owner_id"])
    if "tags" in changes:
        contact.tags = get_or_create_tags(db, changes.pop("tags") or [])
    apply_patch(contact, changes, required={"first_name"})
    contact.updated_at = utcnow()  # also when only tags changed
    db.commit()
    return contact


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, user: CurrentUser, db: DbSession):
    contact = get_owned(db, Contact, contact_id, user)
    deals = db.scalar(select(func.count()).where(Deal.contact_id == contact.id))
    if deals:
        raise AppError(
            409,
            f"This contact still has {deals} deal(s). Delete or move them first.",
            code="has_related_records",
            details=[{"deals": deals}],
        )
    # The contact's own activity history goes with it (PLAN.md §6).
    db.execute(delete(Activity).where(Activity.contact_id == contact.id))
    db.delete(contact)
    db.commit()

from typing import Annotated

from fastapi import APIRouter, Query, Response, UploadFile
from pydantic import ValidationError
from sqlalchemy import delete, func, or_, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app import csv_io
from app.access import apply_patch, get_owned, get_referenced, resolve_owner, scope
from app.clock import local_today, utcnow
from app.deps import CurrentUser, DbSession
from app.errors import AppError, field_error
from app.models import Activity, Company, Contact, Deal, Tag, User
from app.pagination import Page, Pagination, paginate
from app.schemas.contacts import ContactCreate, ContactOut, ContactUpdate, ImportResult

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


def company_by_name(db: Session, user: User, name: str, owner_id: int) -> Company:
    """The visible company with this name (any letter case), or a new one owned by `owner_id`."""
    stmt = scope(select(Company), Company, user).where(func.lower(Company.name) == name.lower())
    company = db.scalars(stmt.order_by(Company.id)).first()
    if company is None:
        company = Company(name=name, owner_id=owner_id)
        db.add(company)
        db.flush()
    return company


def _resolve_company(db: Session, user: User, changes: dict, owner_id: int) -> None:
    """Turn company_id / company_name from the body into a checked company_id."""
    name = changes.pop("company_name", None)
    if name and changes.get("company_id") is not None:
        raise field_error("company_name", "Choose an existing company or type a new name, not both")
    if name:
        changes["company_id"] = company_by_name(db, user, name, owner_id).id
    elif changes.get("company_id") is not None:
        get_referenced(db, Company, changes["company_id"], user, "company_id")


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


@router.get("/export")
def export_contacts(
    user: CurrentUser,
    db: DbSession,
    search: Annotated[str | None, Query(max_length=100)] = None,
    tag: str | None = None,
    company_id: int | None = None,
    owner_id: int | None = None,
):
    """Every contact matching the list filters (not paginated) as a UTF-8 CSV."""
    contacts = db.scalars(contact_query(user, search, tag, company_id, owner_id)).all()
    filename = f"contacts-{local_today().isoformat()}.csv"
    return Response(
        content=csv_io.export_contacts(contacts),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/import", response_model=ImportResult)
async def import_contacts(file: UploadFile, user: CurrentUser, db: DbSession):
    """Import contacts owned by the importer. Bad or duplicate rows are skipped and reported;
    good rows are saved (PLAN.md §9)."""
    raw = await file.read(csv_io.MAX_BYTES + 1)
    try:
        rows = csv_io.read_rows(csv_io.decode(raw))
    except csv_io.CsvError as exc:
        status = 413 if "larger" in str(exc) else 422
        raise AppError(status, str(exc), code="invalid_file") from exc

    visible = scope(select(Contact.email), Contact, user).where(Contact.email.is_not(None))
    seen_emails = {email.lower() for email in db.scalars(visible)}
    companies = {c.name.lower(): c for c in db.scalars(scope(select(Company), Company, user))}
    created, companies_created, errors = 0, 0, []

    for line, values in rows:
        try:
            data, company_name = csv_io.validate_row(values)
        except (ValidationError, ValueError) as exc:
            errors.append({"row": line, "message": csv_io.error_message(exc)})
            continue
        if data.email and data.email in seen_emails:
            errors.append({"row": line, "message": f"Duplicate email {data.email} - skipped"})
            continue

        company = None
        if company_name:
            company = companies.get(company_name.lower())
            if company is None:
                company = Company(name=company_name, owner_id=user.id)
                db.add(company)
                companies[company_name.lower()] = company
                companies_created += 1
        db.add(
            Contact(
                **data.model_dump(exclude={"owner_id", "tags", "company_id", "company_name"}),
                company=company,
                owner_id=user.id,
                tags=get_or_create_tags(db, data.tags),
            )
        )
        db.flush()  # new tags/companies get ids before the next row looks them up
        if data.email:
            seen_emails.add(data.email)
        created += 1

    db.commit()
    return {
        "created": created,
        "skipped": len(errors),
        "companies_created": companies_created,
        "errors": errors,
    }


@router.post("", response_model=ContactOut, status_code=201)
def create_contact(body: ContactCreate, user: CurrentUser, db: DbSession):
    data = body.model_dump(exclude={"owner_id", "tags"})
    owner_id = resolve_owner(db, user, body.owner_id)
    _resolve_company(db, user, data, owner_id)
    contact = Contact(**data, owner_id=owner_id, tags=get_or_create_tags(db, body.tags))
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
    if "owner_id" in changes:
        changes["owner_id"] = resolve_owner(db, user, changes["owner_id"], contact.owner_id)
    _resolve_company(db, user, changes, changes.get("owner_id", contact.owner_id))
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

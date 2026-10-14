from typing import Annotated

from fastapi import APIRouter, Query, Response, UploadFile
from pydantic import ValidationError
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.orm import Session, joinedload, selectinload

from app import csv_io, duplicates, storage
from app.access import apply_patch, get_owned, get_referenced, resolve_owner, scope
from app.clock import local_today, utcnow
from app.deps import CurrentUser, DbSession
from app.errors import AppError, field_error
from app.models import Activity, Attachment, AuditEvent, Company, Contact, Deal, Tag, User
from app.pagination import Page, Pagination, paginate
from app.routers import attachments
from app.schemas.contacts import (
    ContactCreate,
    ContactOut,
    ContactUpdate,
    DuplicateGroup,
    ImportResult,
    MergeIn,
)

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
        raise field_error(
            "company_name",
            "Choose an existing company or type a new name, not both",
            code="company_conflict",
        )
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


MAX_DUPLICATE_GROUPS = 100


@router.get("/duplicates", response_model=list[DuplicateGroup])
def find_duplicates(user: CurrentUser, db: DbSession, owner_id: int | None = None):
    """Visible contacts that look like the same person: same phone (in any format), email or
    full name. Each contact comes with how much hangs on it, to help pick the one to keep."""
    contacts = db.scalars(contact_query(user, owner_id=owner_id)).unique().all()
    groups = duplicates.find_groups(list(contacts))[:MAX_DUPLICATE_GROUPS]
    ids = [c.id for _, group in groups for c in group]

    def counts(column, *where) -> dict[int, int]:
        stmt = select(column, func.count()).where(column.in_(ids), *where).group_by(column)
        return dict(db.execute(stmt).all())

    deals = counts(Deal.contact_id)
    activities = counts(Activity.contact_id)
    files = counts(Attachment.entity_id, Attachment.entity_type == "contact")
    return [
        {
            "reasons": reasons,
            "contacts": [
                {
                    **ContactOut.model_validate(c).model_dump(exclude={"tags"}),
                    "tag_names": c.tag_names,
                    "deals": deals.get(c.id, 0),
                    "activities": activities.get(c.id, 0),
                    "files": files.get(c.id, 0),
                }
                for c in group
            ],
        }
        for reasons, group in groups
    ]


@router.post("/import", response_model=ImportResult)
async def import_contacts(file: UploadFile, user: CurrentUser, db: DbSession):
    """Import contacts owned by the importer. Bad or duplicate rows are skipped and reported;
    good rows are saved (PLAN.md §9)."""
    raw = await file.read(csv_io.MAX_BYTES + 1)
    try:
        rows = csv_io.read_rows(csv_io.decode(raw))
    except csv_io.CsvError as exc:
        raise AppError(exc.status, str(exc), code=exc.code) from exc

    visible = scope(select(Contact.email), Contact, user).where(Contact.email.is_not(None))
    seen_emails = {email.lower() for email in db.scalars(visible)}
    companies = {c.name.lower(): c for c in db.scalars(scope(select(Company), Company, user))}
    created, companies_created, errors = 0, 0, []

    for line, values in rows:
        try:
            data, company_name = csv_io.validate_row(values)
        except (ValidationError, ValueError) as exc:  # includes csv_io.RowError
            field, reason = csv_io.row_error(exc)
            errors.append(
                {
                    "row": line,
                    "code": "invalid_row",
                    "field": field,
                    "reason": reason,
                    "message": f"{field}: {reason}",
                }
            )
            continue
        if data.email and data.email in seen_emails:
            errors.append(
                {
                    "row": line,
                    "code": "duplicate_email",
                    "field": "email",
                    "value": data.email,
                    "message": f"Duplicate email {data.email} - skipped",
                }
            )
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


@router.post("/{contact_id}/merge", response_model=ContactOut)
def merge_contact(contact_id: int, body: MergeIn, user: CurrentUser, db: DbSession):
    """Fold another contact into this one: its deals, activities, files and tags move here,
    blank fields here are filled from it, notes are combined, and it is deleted."""
    keep = get_owned(db, Contact, contact_id, user)
    other = get_referenced(db, Contact, body.other_id, user, "other_id")
    if other.id == keep.id:
        raise field_error("other_id", "Choose a different contact", code="same_contact")

    for field in ("last_name", "email", "phone", "company_id"):
        if getattr(keep, field) is None and getattr(other, field) is not None:
            setattr(keep, field, getattr(other, field))
    if other.notes and other.notes != keep.notes:
        keep.notes = f"{keep.notes}\n\n{other.notes}" if keep.notes else other.notes
    keep.tags = keep.tags + [tag for tag in other.tags if tag not in keep.tags]

    moved = {
        "deals": db.execute(
            update(Deal).where(Deal.contact_id == other.id).values(contact_id=keep.id)
        ).rowcount,
        "activities": db.execute(
            update(Activity).where(Activity.contact_id == other.id).values(contact_id=keep.id)
        ).rowcount,
        "files": db.execute(
            update(Attachment)
            .where(Attachment.entity_type == "contact", Attachment.entity_id == other.id)
            .values(entity_id=keep.id)
        ).rowcount,
    }
    db.add(
        AuditEvent(
            actor_id=user.id,
            entity_type="contact",
            entity_id=keep.id,
            entity_label=keep.full_name,
            action="merged",
            changes=[
                {"field": "merged_from", "from": other.id, "from_label": other.full_name, **moved}
            ],
        )
    )
    db.delete(other)
    keep.updated_at = utcnow()
    db.commit()
    return keep


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
    files = attachments.remove_for(db, "contact", contact.id)
    db.delete(contact)
    db.commit()
    storage.remove(*files)

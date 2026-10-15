from datetime import timedelta

from fastapi import APIRouter, Response
from sqlalchemy import or_, select, update
from sqlalchemy.orm import Session, joinedload

from app import csv_io, storage
from app.access import apply_patch, get_owned, get_referenced, resolve_owner, scope
from app.clock import local_today, utcnow
from app.deps import CurrentUser, DbSession
from app.errors import field_error
from app.models import CLOSED_STAGES, STAGES, Activity, Company, Contact, Deal, Stage, User
from app.pagination import Page, Pagination, paginate
from app.pipeline import apply_closed_at, move_deal, next_position, totals_by_currency
from app.routers import attachments
from app.schemas.deals import BoardColumn, DealCreate, DealMove, DealOut, DealUpdate

router = APIRouter(prefix="/deals", tags=["deals"])

# Won/lost columns on the board only show recently closed deals.
BOARD_CLOSED_DAYS = 90

_LOAD = (joinedload(Deal.contact), joinedload(Deal.company), joinedload(Deal.owner))


def _resolve_links(
    db: Session, user: User, contact_id: int, company_id: int | None
) -> tuple[Contact, int | None]:
    contact = get_referenced(db, Contact, contact_id, user, "contact_id")
    if company_id is not None:
        get_referenced(db, Company, company_id, user, "company_id")
    return contact, company_id


@router.get("", response_model=Page[DealOut])
def list_deals(
    user: CurrentUser,
    db: DbSession,
    pagination: Pagination,
    stage: Stage | None = None,
    contact_id: int | None = None,
    company_id: int | None = None,
    owner_id: int | None = None,
):
    stmt = scope(select(Deal).options(*_LOAD), Deal, user, owner_id)
    if stage is not None:
        stmt = stmt.where(Deal.stage == stage)
    if contact_id is not None:
        stmt = stmt.where(Deal.contact_id == contact_id)
    if company_id is not None:
        stmt = stmt.where(Deal.company_id == company_id)
    stmt = stmt.order_by(Deal.updated_at.desc(), Deal.id.desc())
    return paginate(db, stmt, pagination)


@router.get("/export")
def export_deals(
    user: CurrentUser,
    db: DbSession,
    stage: Stage | None = None,
    owner_id: int | None = None,
):
    """Every visible deal (optionally one stage / owner) as a UTF-8 CSV for Excel."""
    stmt = scope(select(Deal).options(*_LOAD), Deal, user, owner_id)
    if stage is not None:
        stmt = stmt.where(Deal.stage == stage)
    deals = db.scalars(stmt.order_by(Deal.created_at.desc(), Deal.id.desc())).all()
    filename = f"deals-{local_today().isoformat()}.csv"
    return Response(
        content=csv_io.export_deals(deals),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/board", response_model=list[BoardColumn])
def board(user: CurrentUser, db: DbSession, owner_id: int | None = None):
    """All six columns at once, unpaginated, with per-currency totals."""
    closed_since = utcnow() - timedelta(days=BOARD_CLOSED_DAYS)
    stmt = scope(select(Deal).options(*_LOAD), Deal, user, owner_id)
    stmt = stmt.where(
        or_(Deal.stage.not_in(CLOSED_STAGES), Deal.closed_at >= closed_since)
    ).order_by(Deal.position, Deal.id)

    columns: dict[Stage, list[Deal]] = {stage: [] for stage in STAGES}
    for deal in db.scalars(stmt):
        columns[deal.stage].append(deal)
    return [
        {
            "stage": stage,
            "count": len(deals),
            "totals": totals_by_currency((d.currency, d.value) for d in deals),
            "deals": deals,
        }
        for stage, deals in columns.items()
    ]


@router.post("", response_model=DealOut, status_code=201)
def create_deal(body: DealCreate, user: CurrentUser, db: DbSession):
    contact, company_id = _resolve_links(db, user, body.contact_id, body.company_id)
    deal = Deal(
        **body.model_dump(exclude={"owner_id", "company_id"}),
        # no company given -> the contact's company (PLAN.md §6)
        company_id=company_id if company_id is not None else contact.company_id,
        owner_id=resolve_owner(db, user, body.owner_id),
        position=next_position(db, body.stage),
    )
    apply_closed_at(deal, old_stage=None)
    db.add(deal)
    db.commit()
    return deal


@router.get("/{deal_id}", response_model=DealOut)
def get_deal(deal_id: int, user: CurrentUser, db: DbSession):
    return get_owned(db, Deal, deal_id, user)


@router.patch("/{deal_id}", response_model=DealOut)
def update_deal(deal_id: int, body: DealUpdate, user: CurrentUser, db: DbSession):
    deal = get_owned(db, Deal, deal_id, user)
    changes = body.model_dump(exclude_unset=True)

    if changes.get("contact_id") is not None:
        contact = get_referenced(db, Contact, changes["contact_id"], user, "contact_id")
        if "company_id" not in changes and contact.id != deal.contact_id:
            changes["company_id"] = contact.company_id
    if changes.get("company_id") is not None:
        get_referenced(db, Company, changes["company_id"], user, "company_id")
    if "owner_id" in changes:
        changes["owner_id"] = resolve_owner(db, user, changes["owner_id"], deal.owner_id)

    apply_patch(deal, changes, required={"title", "value", "currency", "contact_id"})
    deal.updated_at = utcnow()
    db.commit()
    return deal


@router.patch("/{deal_id}/move", response_model=DealOut)
def move(deal_id: int, body: DealMove, user: CurrentUser, db: DbSession):
    deal = get_owned(db, Deal, deal_id, user)
    before = None
    if body.before_id is not None:
        if body.before_id == deal.id:
            raise field_error(
                "before_id", "A deal cannot be placed before itself", code="bad_position"
            )
        before = get_referenced(db, Deal, body.before_id, user, "before_id")
        if before.stage != body.stage:
            raise field_error(
                "before_id", "That deal is not in the target stage", code="bad_position"
            )

    move_deal(db, deal, body.stage, before)
    deal.updated_at = utcnow()
    db.commit()
    return deal


@router.delete("/{deal_id}", status_code=204)
def delete_deal(deal_id: int, user: CurrentUser, db: DbSession):
    deal = get_owned(db, Deal, deal_id, user)
    # Activities stay on the contact's timeline, just unlinked from the deal (PLAN.md §6).
    db.execute(update(Activity).where(Activity.deal_id == deal.id).values(deal_id=None))
    files = attachments.remove_for(db, "deal", deal.id)
    db.delete(deal)
    db.commit()
    storage.remove(*files)

from enum import StrEnum

from fastapi import APIRouter
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.access import get_owned, is_admin
from app.deps import CurrentUser, DbSession
from app.errors import AppError
from app.models import Activity, AuditEvent, Company, Contact, Deal, Quote
from app.pagination import Page, Pagination, paginate
from app.schemas.history import HistoryEventOut

router = APIRouter(prefix="/history", tags=["history"])


class EntityType(StrEnum):
    company = "company"
    contact = "contact"
    deal = "deal"
    activity = "activity"
    quote = "quote"
    user = "user"


OWNED = {
    EntityType.company: Company,
    EntityType.contact: Contact,
    EntityType.deal: Deal,
    EntityType.activity: Activity,
}


@router.get("", response_model=Page[HistoryEventOut])
def history(
    user: CurrentUser,
    db: DbSession,
    pagination: Pagination,
    entity_type: EntityType | None = None,
    entity_id: int | None = None,
):
    """One record's history (anyone who may see the record), or every change (admins only)."""
    stmt = select(AuditEvent).options(joinedload(AuditEvent.actor))
    if entity_type is not None and entity_id is not None:
        if entity_type in OWNED:
            get_owned(db, OWNED[entity_type], entity_id, user)
        elif entity_type == EntityType.quote:
            quote = db.get(Quote, entity_id)
            if quote is None:
                raise AppError(404, "Quote not found")
            get_owned(db, Deal, quote.deal_id, user)
        elif not is_admin(user):
            raise AppError(403, "Admin access required")
        stmt = stmt.where(AuditEvent.entity_type == entity_type, AuditEvent.entity_id == entity_id)
    elif not is_admin(user):
        raise AppError(403, "Admin access required")
    elif entity_type is not None:
        stmt = stmt.where(AuditEvent.entity_type == entity_type)
    stmt = stmt.order_by(AuditEvent.created_at.desc(), AuditEvent.id.desc())
    return paginate(db, stmt, pagination)

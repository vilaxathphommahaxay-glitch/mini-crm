from datetime import timedelta
from enum import StrEnum

from fastapi import APIRouter
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session, joinedload

from app.access import apply_patch, get_owned, get_referenced, resolve_owner, scope
from app.clock import local_today, utcnow
from app.deps import CurrentUser, DbSession
from app.models import Activity, ActivityType, Contact, Deal, User
from app.pagination import Page, Pagination, paginate
from app.schemas.activities import ActivityCreate, ActivityOut, ActivityUpdate, Reminders

router = APIRouter(prefix="/activities", tags=["activities"])

UPCOMING_DAYS = 7

LOAD = (joinedload(Activity.contact), joinedload(Activity.deal), joinedload(Activity.owner))


class Due(StrEnum):
    overdue = "overdue"
    today = "today"
    upcoming = "upcoming"


def filter_due(stmt: Select, due: Due) -> Select:
    """Due-date windows in APP_TIMEZONE (PLAN.md §6)."""
    today = local_today()
    if due == Due.overdue:
        return stmt.where(Activity.due_date < today)
    if due == Due.today:
        return stmt.where(Activity.due_date == today)
    return stmt.where(
        Activity.due_date > today, Activity.due_date <= today + timedelta(days=UPCOMING_DAYS)
    )


def _check_links(db: Session, user: User, changes: dict) -> None:
    """Validate contact/deal references; a deal without a contact borrows the deal's contact."""
    if changes.get("contact_id") is not None:
        get_referenced(db, Contact, changes["contact_id"], user, "contact_id")
    if changes.get("deal_id") is not None:
        deal = get_referenced(db, Deal, changes["deal_id"], user, "deal_id")
        if changes.get("contact_id") is None:
            changes["contact_id"] = deal.contact_id


def _sync_completed_at(activity: Activity) -> None:
    if activity.done and activity.completed_at is None:
        activity.completed_at = utcnow()
    elif not activity.done:
        activity.completed_at = None


@router.get("", response_model=Page[ActivityOut])
def list_activities(
    user: CurrentUser,
    db: DbSession,
    pagination: Pagination,
    contact_id: int | None = None,
    deal_id: int | None = None,
    type: ActivityType | None = None,
    due: Due | None = None,
    done: bool | None = None,
    owner_id: int | None = None,
):
    stmt = scope(select(Activity).options(*LOAD), Activity, user, owner_id)
    if contact_id is not None:
        stmt = stmt.where(Activity.contact_id == contact_id)
    if deal_id is not None:
        stmt = stmt.where(Activity.deal_id == deal_id)
    if type is not None:
        stmt = stmt.where(Activity.type == type)
    if due is not None:
        stmt = filter_due(stmt, due)
        if done is None:
            done = False  # due-date views are to-do lists
    if done is not None:
        stmt = stmt.where(Activity.done == done)

    if due is not None:
        stmt = stmt.order_by(Activity.due_date, Activity.id)
    else:
        stmt = stmt.order_by(Activity.created_at.desc(), Activity.id.desc())
    return paginate(db, stmt, pagination)


@router.get("/reminders", response_model=Reminders)
def reminders(user: CurrentUser, db: DbSession):
    """The signed-in user's own open tasks that need attention, for the badge on every page.

    Admins get their own count too: the badge is a personal to-do reminder, not a team report.
    """

    def count(due: Due) -> int:
        stmt = filter_due(
            select(func.count()).where(Activity.owner_id == user.id, Activity.done.is_(False)),
            due,
        )
        return db.scalar(stmt) or 0

    return {"overdue": count(Due.overdue), "today": count(Due.today)}


@router.post("", response_model=ActivityOut, status_code=201)
def create_activity(body: ActivityCreate, user: CurrentUser, db: DbSession):
    data = body.model_dump(exclude={"owner_id"})
    _check_links(db, user, data)
    activity = Activity(**data, owner_id=resolve_owner(db, user, body.owner_id))
    _sync_completed_at(activity)
    db.add(activity)
    db.commit()
    return activity


@router.get("/{activity_id}", response_model=ActivityOut)
def get_activity(activity_id: int, user: CurrentUser, db: DbSession):
    return get_owned(db, Activity, activity_id, user)


@router.patch("/{activity_id}", response_model=ActivityOut)
def update_activity(activity_id: int, body: ActivityUpdate, user: CurrentUser, db: DbSession):
    activity = get_owned(db, Activity, activity_id, user)
    changes = body.model_dump(exclude_unset=True)
    if changes.get("deal_id") is not None and "contact_id" not in changes:
        # so a newly linked deal fills in the contact only when the activity has none
        changes["contact_id"] = activity.contact_id
    _check_links(db, user, changes)
    if "owner_id" in changes:
        changes["owner_id"] = resolve_owner(db, user, changes["owner_id"], activity.owner_id)

    apply_patch(activity, changes, required={"type", "subject", "done"})
    _sync_completed_at(activity)
    activity.updated_at = utcnow()
    db.commit()
    return activity


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int, user: CurrentUser, db: DbSession):
    db.delete(get_owned(db, Activity, activity_id, user))
    db.commit()

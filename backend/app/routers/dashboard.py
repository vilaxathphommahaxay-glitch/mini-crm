from collections import defaultdict
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import exists, func, select
from sqlalchemy.orm import Session, joinedload

from app.access import scope
from app.clock import app_tz, local_today
from app.deps import AdminUser, CurrentUser, DbSession
from app.models import CLOSED_STAGES, STAGES, Activity, Deal, Stage, User
from app.pipeline import totals_by_currency
from app.routers.activities import LOAD, Due, filter_due
from app.schemas.dashboard import DashboardSummary, TeamMember

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MONTHS = 12
OVERDUE_ITEMS = 10
NO_NEXT_STEP_ITEMS = 10


def _last_months(count: int) -> list[tuple[int, int]]:
    """(year, month) for the last `count` months, oldest first, including this month."""
    today = local_today()
    index = today.year * 12 + today.month - 1
    return [divmod(i, 12) for i in range(index - count + 1, index + 1)]


def _pipeline(db: Session, user: User, owner_id: int | None) -> list[dict]:
    stmt = select(Deal.stage, Deal.currency, func.count(), func.sum(Deal.value)).group_by(
        Deal.stage, Deal.currency
    )
    rows = db.execute(scope(stmt, Deal, user, owner_id)).all()
    counts: dict[Stage, int] = defaultdict(int)
    sums: dict[Stage, list] = defaultdict(list)
    for stage, currency, count, total in rows:
        counts[stage] += count
        sums[stage].append((currency, total))
    return [{"stage": s, "count": counts[s], "totals": totals_by_currency(sums[s])} for s in STAGES]


def _won_by_month(db: Session, user: User, owner_id: int | None) -> list[dict]:
    months = _last_months(MONTHS)
    first_year, first_month0 = months[0]
    window_start = datetime(first_year, first_month0 + 1, 1, tzinfo=app_tz()).astimezone(UTC)

    stmt = select(Deal.closed_at, Deal.currency, Deal.value).where(
        Deal.stage == Stage.won, Deal.closed_at >= window_start
    )
    # Grouped in Python: month boundaries are in APP_TIMEZONE, and this stays DB-agnostic.
    buckets: dict[str, list] = defaultdict(list)
    for closed_at, currency, value in db.execute(scope(stmt, Deal, user, owner_id)):
        local = closed_at.astimezone(app_tz())
        buckets[f"{local.year:04d}-{local.month:02d}"].append((currency, value))

    keys = [f"{year:04d}-{month0 + 1:02d}" for year, month0 in months]
    return [{"month": key, "totals": totals_by_currency(buckets[key])} for key in keys]


def _tasks(db: Session, user: User, owner_id: int | None) -> dict:
    def open_tasks(due: Due):
        stmt = select(Activity).where(Activity.done.is_(False))
        return filter_due(scope(stmt, Activity, user, owner_id), due)

    def count(due: Due) -> int:
        return db.scalar(select(func.count()).select_from(open_tasks(due).subquery())) or 0

    overdue_items = db.scalars(
        open_tasks(Due.overdue)
        .options(*LOAD)
        .order_by(Activity.due_date, Activity.id)
        .limit(OVERDUE_ITEMS)
    ).all()
    return {
        "overdue": count(Due.overdue),
        "today": count(Due.today),
        "upcoming": count(Due.upcoming),
        "overdue_items": overdue_items,
    }


def _deals_without_next_step(
    db: Session, user: User, owner_id: int | None, limit: int = NO_NEXT_STEP_ITEMS
) -> dict:
    """Open deals with no open task on them - the ones most likely to be forgotten."""
    has_open_task = exists().where(
        Activity.deal_id == Deal.id, Activity.done.is_(False), Activity.due_date.is_not(None)
    )
    stmt = scope(select(Deal), Deal, user, owner_id).where(
        Deal.stage.not_in(CLOSED_STAGES), ~has_open_task
    )
    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0
    items = db.scalars(
        stmt.options(joinedload(Deal.contact))
        .order_by(Deal.updated_at, Deal.id)  # longest untouched first
        .limit(limit)
    ).all()
    return {"count": total, "items": items}


@router.get("/summary", response_model=DashboardSummary)
def summary(
    user: CurrentUser,
    db: DbSession,
    owner_id: int | None = None,
    # the dashboard shows 10; "Show all" asks for more
    no_next_step_limit: Annotated[int, Query(ge=1, le=200)] = NO_NEXT_STEP_ITEMS,
):
    pipeline = _pipeline(db, user, owner_id)
    return {
        "open_deals": sum(p["count"] for p in pipeline if p["stage"] not in CLOSED_STAGES),
        "pipeline": pipeline,
        "won_by_month": _won_by_month(db, user, owner_id),
        "tasks": _tasks(db, user, owner_id),
        "no_next_step": _deals_without_next_step(db, user, owner_id, no_next_step_limit),
    }


@router.get("/team", response_model=list[TeamMember])
def team(_: AdminUser, db: DbSession):
    """Per-person overview for managers: open pipeline, wins this month, overdue tasks."""
    today = local_today()
    month_start = datetime(today.year, today.month, 1, tzinfo=app_tz()).astimezone(UTC)

    open_rows = db.execute(
        select(Deal.owner_id, Deal.currency, func.count(), func.sum(Deal.value))
        .where(Deal.stage.not_in(CLOSED_STAGES))
        .group_by(Deal.owner_id, Deal.currency)
    ).all()
    won_rows = db.execute(
        select(Deal.owner_id, Deal.currency, func.count(), func.sum(Deal.value))
        .where(Deal.stage == Stage.won, Deal.closed_at >= month_start)
        .group_by(Deal.owner_id, Deal.currency)
    ).all()
    overdue = dict(
        db.execute(
            filter_due(
                select(Activity.owner_id, func.count()).where(Activity.done.is_(False)),
                Due.overdue,
            ).group_by(Activity.owner_id)
        ).all()
    )

    def per_owner(rows):
        counts: dict[int, int] = defaultdict(int)
        sums: dict[int, list] = defaultdict(list)
        for owner, currency, count, total in rows:
            counts[owner] += count
            sums[owner].append((currency, total))
        return counts, sums

    open_counts, open_sums = per_owner(open_rows)
    won_counts, won_sums = per_owner(won_rows)
    users = db.scalars(select(User).order_by(User.is_active.desc(), User.name)).all()
    return [
        {
            "user": u,
            "is_active": u.is_active,
            "open_deals": open_counts[u.id],
            "open_value": totals_by_currency(open_sums[u.id]),
            "won_this_month": won_counts[u.id],
            "won_value": totals_by_currency(won_sums[u.id]),
            "overdue_tasks": overdue.get(u.id, 0),
        }
        for u in users
        # skip disabled people who no longer own anything open
        if u.is_active or open_counts[u.id] or overdue.get(u.id)
    ]

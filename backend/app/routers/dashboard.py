from collections import defaultdict
from datetime import UTC, datetime

from fastapi import APIRouter
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.access import scope
from app.clock import app_tz, local_today
from app.deps import CurrentUser, DbSession
from app.models import CLOSED_STAGES, STAGES, Activity, Deal, Stage, User
from app.pipeline import totals_by_currency
from app.routers.activities import LOAD, Due, filter_due
from app.schemas.dashboard import DashboardSummary

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

MONTHS = 12
OVERDUE_ITEMS = 10


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


@router.get("/summary", response_model=DashboardSummary)
def summary(user: CurrentUser, db: DbSession, owner_id: int | None = None):
    pipeline = _pipeline(db, user, owner_id)
    return {
        "open_deals": sum(p["count"] for p in pipeline if p["stage"] not in CLOSED_STAGES),
        "pipeline": pipeline,
        "won_by_month": _won_by_month(db, user, owner_id),
        "tasks": _tasks(db, user, owner_id),
    }

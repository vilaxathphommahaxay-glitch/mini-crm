"""Deal pipeline rules: ordering inside a stage, closed_at, and per-currency totals."""

from collections import defaultdict
from collections.abc import Iterable
from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.clock import utcnow
from app.models import CLOSED_STAGES, Currency, Deal, Stage

CENT = Decimal("0.01")


def totals_by_currency(pairs: Iterable[tuple[Currency, Decimal]]) -> list[dict]:
    """[(currency, amount), ...] -> [{"currency", "amount"}] in a fixed currency order.

    Amounts are never added across currencies (PLAN.md §2).
    """
    sums: dict[Currency, Decimal] = defaultdict(Decimal)
    for currency, amount in pairs:
        sums[Currency(currency)] += Decimal(amount or 0)
    return [
        {"currency": currency, "amount": sums[currency].quantize(CENT)}
        for currency in Currency
        if currency in sums
    ]


def next_position(db: Session, stage: Stage) -> int:
    last = db.scalar(select(func.max(Deal.position)).where(Deal.stage == stage))
    return 0 if last is None else last + 1


def apply_closed_at(deal: Deal, old_stage: Stage | None) -> None:
    """Entering won/lost stamps closed_at; going back to an open stage clears it."""
    if deal.stage in CLOSED_STAGES:
        if old_stage != deal.stage or deal.closed_at is None:
            deal.closed_at = utcnow()
    else:
        deal.closed_at = None


def _column(db: Session, stage: Stage, exclude_id: int) -> list[Deal]:
    stmt = (
        select(Deal)
        .where(Deal.stage == stage, Deal.id != exclude_id)
        .order_by(Deal.position, Deal.id)
    )
    return list(db.scalars(stmt))


def move_deal(db: Session, deal: Deal, stage: Stage, before: Deal | None) -> None:
    """Put `deal` into `stage` just before `before` (or at the end), then renumber 0..n-1.

    Positions are global per stage (all owners), so a staff member's filtered view keeps the
    same relative order. The caller commits, making the whole move one transaction.
    """
    old_stage = deal.stage
    column = _column(db, stage, deal.id)
    index = column.index(before) if before is not None else len(column)
    column.insert(index, deal)

    deal.stage = stage
    for position, item in enumerate(column):
        item.position = position

    if old_stage != stage:
        for position, item in enumerate(_column(db, old_stage, deal.id)):
            item.position = position
    apply_closed_at(deal, old_stage)

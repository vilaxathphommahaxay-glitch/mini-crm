from datetime import datetime

from app.models import Currency, Stage
from app.schemas.activities import ActivityOut
from app.schemas.common import ContactRef, OutputModel
from app.schemas.deals import CurrencyTotal, Money


class StageSummary(OutputModel):
    stage: Stage
    count: int
    totals: list[CurrencyTotal]


class MonthTotal(OutputModel):
    month: str  # "YYYY-MM" in APP_TIMEZONE
    totals: list[CurrencyTotal]


class TaskSummary(OutputModel):
    overdue: int
    today: int
    upcoming: int
    overdue_items: list[ActivityOut]


class StaleDeal(OutputModel):
    id: int
    title: str
    stage: Stage
    value: Money
    currency: Currency
    contact: ContactRef
    updated_at: datetime


class NoNextStep(OutputModel):
    count: int
    items: list[StaleDeal]


class DashboardSummary(OutputModel):
    open_deals: int
    pipeline: list[StageSummary]
    won_by_month: list[MonthTotal]
    tasks: TaskSummary
    no_next_step: NoNextStep

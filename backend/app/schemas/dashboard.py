from app.models import Stage
from app.schemas.activities import ActivityOut
from app.schemas.common import OutputModel
from app.schemas.deals import CurrencyTotal


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


class DashboardSummary(OutputModel):
    open_deals: int
    pipeline: list[StageSummary]
    won_by_month: list[MonthTotal]
    tasks: TaskSummary

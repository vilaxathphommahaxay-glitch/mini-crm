"""Single source of "now", so tests can freeze time with `freeze()`."""

from datetime import UTC, date, datetime
from zoneinfo import ZoneInfo

from app.config import get_settings

_frozen: datetime | None = None


def freeze(moment: datetime | None) -> None:
    """Test helper: make utcnow() return `moment` (None to unfreeze)."""
    global _frozen
    _frozen = moment


def utcnow() -> datetime:
    return _frozen if _frozen is not None else datetime.now(UTC)


def app_tz() -> ZoneInfo:
    return ZoneInfo(get_settings().app_timezone)


def local_today() -> date:
    """Today's date in APP_TIMEZONE — used for overdue/today/upcoming."""
    return utcnow().astimezone(app_tz()).date()

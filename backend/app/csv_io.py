"""CSV import/export for contacts (PLAN.md §9)."""

import csv
import io
import re
from collections.abc import Iterable
from datetime import datetime

from pydantic import ValidationError

from app.clock import app_tz
from app.models import Contact, Deal
from app.schemas.contacts import ContactCreate

COLUMNS = ["first_name", "last_name", "email", "phone", "company", "tags", "notes"]
MAX_BYTES = 1_000_000
MAX_ROWS = 1000
TAG_SEPARATOR = ";"

# A phone number like "+856 20 555" or "-" is safe; "+SUM(...)" or "=cmd" is not.
_PHONE_LIKE = re.compile(r"^[+-][\d\s().-]*$")


class CsvError(ValueError):
    """The file as a whole can't be imported. `code` lets the UI show it in the user's language."""

    def __init__(self, code: str, message: str, status: int = 422):
        super().__init__(message)
        self.code = code
        self.status = status


class RowError(ValueError):
    """One row can't be imported: which field, and why (required / invalid / too_long)."""

    def __init__(self, field: str, reason: str):
        super().__init__(f"{field}: {reason}")
        self.field = field
        self.reason = reason


def _safe_cell(value: str | None) -> str:
    """Stop spreadsheet apps from running a cell as a formula (CSV injection)."""
    if not value:
        return ""
    first = value[0]
    if first in "=@\t\r" or (first in "+-" and not _PHONE_LIKE.match(value)):
        return "'" + value
    return value


def export_contacts(contacts: Iterable[Contact]) -> str:
    out = io.StringIO()
    # BOM so Excel opens Lao/Thai text as UTF-8; CRLF line ends are what Excel expects.
    out.write("﻿")
    writer = csv.writer(out, lineterminator="\r\n")
    writer.writerow(COLUMNS)
    for c in contacts:
        row = [
            c.first_name,
            c.last_name,
            c.email,
            c.phone,
            c.company.name if c.company else None,
            TAG_SEPARATOR.join(c.tag_names),
            c.notes,
        ]
        writer.writerow([_safe_cell(v) for v in row])
    return out.getvalue()


DEAL_COLUMNS = [
    "title",
    "stage",
    "value",
    "currency",
    "contact",
    "company",
    "owner",
    "expected_close_date",
    "closed_date",
    "created_date",
]


def _local_date(moment: datetime | None) -> str | None:
    return moment.astimezone(app_tz()).date().isoformat() if moment else None


def export_deals(deals: Iterable[Deal]) -> str:
    """Deals for a spreadsheet: amounts as plain numbers, dates as YYYY-MM-DD in APP_TIMEZONE."""
    out = io.StringIO()
    out.write("﻿")  # BOM: Excel then reads Lao text as UTF-8
    writer = csv.writer(out, lineterminator="\r\n")
    writer.writerow(DEAL_COLUMNS)
    for d in deals:
        row = [
            d.title,
            d.stage.value,
            f"{d.value:.2f}",
            d.currency.value,
            d.contact.full_name,
            d.company.name if d.company else None,
            d.owner.name,
            d.expected_close_date.isoformat() if d.expected_close_date else None,
            _local_date(d.closed_at),
            _local_date(d.created_at),
        ]
        writer.writerow([_safe_cell(v) for v in row])
    return out.getvalue()


def decode(raw: bytes) -> str:
    if len(raw) > MAX_BYTES:
        raise CsvError(
            "file_too_large", f"The file is larger than {MAX_BYTES // 1_000_000} MB", status=413
        )
    try:
        return raw.decode("utf-8-sig")  # also strips a BOM if there is one
    except UnicodeDecodeError as exc:
        raise CsvError("file_not_utf8", "The file must be saved as UTF-8 CSV") from exc


def read_rows(text: str) -> list[tuple[int, dict[str, str]]]:
    """(line number, row) pairs with lower-cased headers; blank rows dropped."""
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise CsvError("file_empty", "The file is empty")
    headers = [(h or "").strip().lower() for h in reader.fieldnames]
    if "first_name" not in headers:
        raise CsvError(
            "file_missing_column",
            f"Missing a first_name column. Expected columns: {', '.join(COLUMNS)}",
        )
    reader.fieldnames = headers

    rows = []
    for row in reader:
        values = {k: (v or "").strip() for k, v in row.items() if k in COLUMNS}
        if any(values.values()):
            rows.append((reader.line_num, values))
        if len(rows) > MAX_ROWS:
            raise CsvError(
                "file_too_many_rows", f"Too many rows: at most {MAX_ROWS} contacts per file"
            )
    return rows


def validate_row(values: dict[str, str]) -> tuple[ContactCreate, str | None]:
    """Validate one row with the same rules as the API. Returns (contact, company name)."""
    contact = ContactCreate(
        first_name=values.get("first_name", ""),
        last_name=values.get("last_name"),
        email=values.get("email"),
        phone=values.get("phone"),
        notes=values.get("notes"),
        tags=[t for t in values.get("tags", "").split(TAG_SEPARATOR)],
    )
    company = values.get("company") or None
    if company and len(company) > 200:
        raise RowError("company", "too_long")
    return contact, company


def row_error(exc: Exception) -> tuple[str, str]:
    """(field, reason) of the first problem in a bad row; reason is required/invalid/too_long."""
    if isinstance(exc, RowError):
        return exc.field, exc.reason
    if isinstance(exc, ValidationError):
        first = exc.errors()[0]
        field = str(first["loc"][0]) if first["loc"] else "row"
        kind = first["type"]
        if kind in ("missing", "too_short", "string_too_short"):
            return field, "required"
        if kind in ("too_long", "string_too_long"):
            return field, "too_long"
        return field, "invalid"
    return "row", "invalid"

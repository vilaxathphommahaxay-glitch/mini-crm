"""CSV import/export for contacts (PLAN.md §9)."""

import csv
import io
import re
from collections.abc import Iterable

from pydantic import ValidationError

from app.models import Contact
from app.schemas.contacts import ContactCreate

COLUMNS = ["first_name", "last_name", "email", "phone", "company", "tags", "notes"]
MAX_BYTES = 1_000_000
MAX_ROWS = 1000
TAG_SEPARATOR = ";"

# A phone number like "+856 20 555" or "-" is safe; "+SUM(...)" or "=cmd" is not.
_PHONE_LIKE = re.compile(r"^[+-][\d\s().-]*$")


class CsvError(ValueError):
    """The file as a whole can't be imported."""


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


def decode(raw: bytes) -> str:
    if len(raw) > MAX_BYTES:
        raise CsvError(f"The file is larger than {MAX_BYTES // 1_000_000} MB")
    try:
        return raw.decode("utf-8-sig")  # also strips a BOM if there is one
    except UnicodeDecodeError as exc:
        raise CsvError("The file must be saved as UTF-8 CSV") from exc


def read_rows(text: str) -> list[tuple[int, dict[str, str]]]:
    """(line number, row) pairs with lower-cased headers; blank rows dropped."""
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise CsvError("The file is empty")
    headers = [(h or "").strip().lower() for h in reader.fieldnames]
    if "first_name" not in headers:
        raise CsvError(f"Missing a first_name column. Expected columns: {', '.join(COLUMNS)}")
    reader.fieldnames = headers

    rows = []
    for row in reader:
        values = {k: (v or "").strip() for k, v in row.items() if k in COLUMNS}
        if any(values.values()):
            rows.append((reader.line_num, values))
        if len(rows) > MAX_ROWS:
            raise CsvError(f"Too many rows: at most {MAX_ROWS} contacts per file")
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
        raise ValueError("company: at most 200 characters")
    return contact, company


def error_message(exc: Exception) -> str:
    if isinstance(exc, ValidationError):
        return "; ".join(
            f"{'.'.join(str(p) for p in err['loc'])}: {err['msg']}" for err in exc.errors()
        )
    return str(exc)

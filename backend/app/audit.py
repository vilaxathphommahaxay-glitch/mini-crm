"""Edit history, recorded automatically for every change a signed-in user makes.

get_current_user puts the user's id on the request's database session; after each flush, the
new, changed and deleted records of the tracked kinds are written to audit_events in the same
transaction. Sessions without a user (the seed script, tests' factories) record nothing.
"""

import enum
from datetime import date, datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import event, insert, inspect
from sqlalchemy.orm import Session, attributes

from app.clock import utcnow
from app.models import (
    Activity,
    Attachment,
    AuditEvent,
    Company,
    Contact,
    Deal,
    Quote,
    QuoteItem,
    User,
)

ACTOR_KEY = "audit_actor_id"

TRACKED: dict[type, str] = {
    Company: "company",
    Contact: "contact",
    Deal: "deal",
    Activity: "activity",
    Quote: "quote",
}
# bookkeeping columns that change as a side effect, not because someone edited them
IGNORED = {"id", "created_at", "updated_at", "position", "closed_at", "completed_at"}
# foreign keys are stored with the name they pointed to, so history reads "Somchai → Keo"
REFERENCES: dict[str, type] = {
    "owner_id": User,
    "company_id": Company,
    "contact_id": Contact,
    "deal_id": Deal,
}


def set_actor(session: Session, user_id: int) -> None:
    session.info[ACTOR_KEY] = user_id


def label_of(obj: Any) -> str:
    if isinstance(obj, Company | User):
        return obj.name
    if isinstance(obj, Contact):
        return obj.full_name
    if isinstance(obj, Deal):
        return obj.title
    if isinstance(obj, Activity):
        return obj.subject
    if isinstance(obj, Quote):
        return obj.number
    return str(obj)


def _plain(value: Any) -> Any:
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, Decimal):
        return f"{value:.2f}"
    if isinstance(value, date | datetime):
        return value.isoformat()
    return value


def _reference_label(session: Session, model: type, ref_id: int | None) -> str | None:
    if ref_id is None:
        return None
    with session.no_autoflush:
        obj = session.get(model, ref_id)
    return label_of(obj) if obj is not None else None


def _changes(session: Session, obj: Any) -> list[dict]:
    state = inspect(obj)
    found = []
    for column in state.mapper.column_attrs:
        name = column.key
        if name in IGNORED:
            continue
        history = state.attrs[name].history
        if not history.has_changes():
            continue
        old = history.deleted[0] if history.deleted else None
        new = history.added[0] if history.added else None
        if _plain(old) == _plain(new):
            continue
        change = {"field": name, "from": _plain(old), "to": _plain(new)}
        if name in REFERENCES:
            change["from_label"] = _reference_label(session, REFERENCES[name], old)
            change["to_label"] = _reference_label(session, REFERENCES[name], new)
        found.append(change)
    if isinstance(obj, Contact):
        tags = attributes.get_history(obj, "tags")
        added = sorted({t.name for t in tags.added} - {t.name for t in tags.deleted})
        removed = sorted({t.name for t in tags.deleted} - {t.name for t in tags.added})
        if added or removed:
            found.append({"field": "tags", "added": added, "removed": removed})
    return found


@event.listens_for(Session, "after_flush")
def _record(session: Session, _flush_context) -> None:
    actor = session.info.get(ACTOR_KEY)
    if actor is None:
        return
    now = utcnow()
    rows = []

    def add(obj: Any, action: str, changes: list[dict] | None = None) -> None:
        rows.append(
            {
                "created_at": now,
                "actor_id": actor,
                "entity_type": TRACKED[type(obj)],
                "entity_id": obj.id,
                "entity_label": label_of(obj)[:200],
                "action": action,
                "changes": changes,
            }
        )

    for obj in session.new:
        if type(obj) in TRACKED:
            add(obj, "created")
    for obj in session.dirty:
        if type(obj) in TRACKED and session.is_modified(obj, include_collections=True):
            changes = _changes(session, obj)
            if changes:
                add(obj, "updated", changes)
    for obj in session.deleted:
        if type(obj) in TRACKED:
            add(obj, "deleted")

    # A quote's lines are replaced as a whole on every save: note it on the quote's own entry.
    quotes_with_new_lines = {
        obj.quote_id
        for obj in (*session.new, *session.deleted)
        if isinstance(obj, QuoteItem) and obj.quote_id is not None
    }
    for quote_id in quotes_with_new_lines:
        entry = next(
            (r for r in rows if r["entity_type"] == "quote" and r["entity_id"] == quote_id), None
        )
        if entry is None:
            with session.no_autoflush:
                quote = session.get(Quote, quote_id)
            if quote is not None:
                add(quote, "updated", [{"field": "items"}])
        elif entry["action"] == "updated":
            entry["changes"].append({"field": "items"})

    # Files are logged on the record they belong to: "Files: added contract.pdf".
    parents = {"contact": Contact, "company": Company, "deal": Deal}
    for obj, side in [
        *((o, "added") for o in session.new),
        *((o, "removed") for o in session.deleted),
    ]:
        if not isinstance(obj, Attachment) or obj.entity_type not in parents:
            continue
        entry = next(
            (
                r
                for r in rows
                if r["entity_type"] == obj.entity_type and r["entity_id"] == obj.entity_id
            ),
            None,
        )
        if entry is None:
            with session.no_autoflush:
                parent = session.get(parents[obj.entity_type], obj.entity_id)
            if parent is None:
                continue
            add(parent, "updated", [])
            entry = rows[-1]
        if entry["action"] != "updated":
            continue
        change = next((c for c in entry["changes"] if c["field"] == "files"), None)
        if change is None:
            change = {"field": "files", "added": [], "removed": []}
            entry["changes"].append(change)
        change[side].append(obj.filename)

    if rows:
        session.connection().execute(insert(AuditEvent), rows)

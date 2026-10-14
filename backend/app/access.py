"""Ownership rules shared by every resource (PLAN.md §6).

- Staff only ever see rows they own; other rows behave as if they don't exist (404).
- Admins see everything and may filter by / assign any active owner.
"""

from typing import Any

from sqlalchemy import Select
from sqlalchemy.orm import Session

from app.errors import AppError, field_error, not_found
from app.models import Activity, Company, Contact, Deal, Role, User

Owned = Company | Contact | Deal | Activity

LABELS = {Company: "Company", Contact: "Contact", Deal: "Deal", Activity: "Activity"}


def is_admin(user: User) -> bool:
    return user.role == Role.admin


def scope(stmt: Select, model: type[Owned], user: User, owner_id: int | None = None) -> Select:
    """Restrict a query to what `user` may see, plus an optional admin owner filter."""
    if not is_admin(user):
        return stmt.where(model.owner_id == user.id)
    if owner_id is not None:
        stmt = stmt.where(model.owner_id == owner_id)
    return stmt


def can_access(user: User, obj: Owned) -> bool:
    return is_admin(user) or obj.owner_id == user.id


def get_owned[M: Owned](db: Session, model: type[M], obj_id: int, user: User) -> M:
    """Load a row for the URL being requested: missing or not yours -> 404."""
    obj = db.get(model, obj_id)
    if obj is None or not can_access(user, obj):
        raise not_found(LABELS[model])
    return obj


def get_referenced[M: Owned](db: Session, model: type[M], obj_id: int, user: User, field: str) -> M:
    """Load a row referenced from a request body: missing or not yours -> 422 on that field."""
    obj = db.get(model, obj_id)
    if obj is None or not can_access(user, obj):
        raise field_error(field, f"{LABELS[model]} not found")
    return obj


def resolve_owner(
    db: Session, user: User, requested: int | None, current: int | None = None
) -> int:
    """Owner for a new or reassigned row. Staff can only assign to themselves.

    `current` is the row's existing owner: sending it back unchanged is not a reassignment,
    so records of a since-deactivated user stay editable.
    """
    if current is not None and requested == current:
        return current
    if requested is None or requested == user.id:
        return user.id
    if not is_admin(user):
        raise AppError(403, "You can only assign records to yourself")
    target = db.get(User, requested)
    if target is None or not target.is_active:
        raise field_error("owner_id", "Owner must be an active user")
    return target.id


def apply_patch(obj: Any, changes: dict[str, Any], required: set[str]) -> None:
    """Copy PATCH fields onto `obj`; required fields may be changed but not cleared."""
    for field, value in changes.items():
        if value is None and field in required:
            raise field_error(field, "Cannot be empty")
        setattr(obj, field, value)

from typing import Annotated

from fastapi import APIRouter, Query
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.deps import AdminUser, DbSession
from app.errors import AppError, field_error, not_found
from app.models import Role, User
from app.pagination import Page, Pagination, paginate
from app.schemas.users import UserCreate, UserOut, UserUpdate
from app.security import hash_password

router = APIRouter(prefix="/users", tags=["users"])


def _ensure_email_free(db: Session, email: str, exclude_id: int | None = None) -> None:
    stmt = select(User.id).where(User.email == email)
    if exclude_id is not None:
        stmt = stmt.where(User.id != exclude_id)
    if db.scalar(stmt) is not None:
        raise AppError(409, "A user with this email already exists", code="email_taken")


@router.get("", response_model=Page[UserOut])
def list_users(
    _: AdminUser,
    db: DbSession,
    pagination: Pagination,
    search: Annotated[str | None, Query(max_length=100)] = None,
    is_active: bool | None = None,
):
    stmt = select(User).order_by(User.name, User.id)
    if search:
        pattern = f"%{search.strip()}%"
        stmt = stmt.where(or_(User.name.ilike(pattern), User.email.ilike(pattern)))
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
    return paginate(db, stmt, pagination)


@router.post("", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, _: AdminUser, db: DbSession):
    _ensure_email_free(db, body.email)
    user = User(
        name=body.name,
        email=body.email,
        password_hash=hash_password(body.password),
        role=body.role,
    )
    db.add(user)
    db.commit()
    return user


@router.patch("/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, admin: AdminUser, db: DbSession):
    user = db.get(User, user_id)
    if user is None:
        raise not_found("User")

    changes = body.model_dump(exclude_unset=True)
    if user.id == admin.id:
        # Keeps at least one admin who can still log in.
        if changes.get("is_active") is False:
            raise AppError(409, "You cannot deactivate your own account", code="self_change")
        if changes.get("role") == Role.staff:
            raise AppError(409, "You cannot remove your own admin role", code="self_change")

    if "email" in changes:
        _ensure_email_free(db, changes["email"], exclude_id=user.id)
    if "password" in changes:
        user.password_hash = hash_password(changes.pop("password"))
    for field, value in changes.items():
        if value is None:
            raise field_error(field, "Cannot be empty")
        setattr(user, field, value)

    db.commit()
    return user

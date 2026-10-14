import math

from fastapi import APIRouter, Request
from sqlalchemy import select

from app.deps import CurrentUser, DbSession
from app.errors import AppError, field_error
from app.models import User
from app.ratelimit import account_limiter, client_limiter, login_keys
from app.schemas.users import ChangePasswordIn, LoginIn, TokenOut, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])

# Compared against when the email doesn't exist, so response time doesn't reveal valid emails.
_DUMMY_HASH = hash_password("not-a-real-password")


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, request: Request, db: DbSession):
    account, client = login_keys(body.email, request.client.host if request.client else None)
    wait = account_limiter.retry_after(account) or client_limiter.retry_after(client)
    if wait is not None:
        minutes = max(1, math.ceil(wait.total_seconds() / 60))
        raise AppError(
            429,
            f"Too many failed sign-ins. Try again in {minutes} minute(s).",
            code="too_many_attempts",
            details=[{"minutes": minutes}],
        )

    user = db.scalar(select(User).where(User.email == body.email))
    password_ok = verify_password(body.password, user.password_hash if user else _DUMMY_HASH)
    if user is None or not password_ok:
        account_limiter.failed(account)
        client_limiter.failed(client)
        raise AppError(401, "Incorrect email or password", code="invalid_credentials")
    account_limiter.succeeded(account)
    if not user.is_active:
        raise AppError(403, "This account has been disabled", code="account_disabled")
    return {"access_token": create_access_token(user.id), "user": user}


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser):
    return user


@router.post("/change-password", status_code=204)
def change_password(body: ChangePasswordIn, user: CurrentUser, db: DbSession):
    if not verify_password(body.current_password, user.password_hash):
        raise field_error(
            "current_password", "Current password is incorrect", code="wrong_password"
        )
    user.password_hash = hash_password(body.new_password)
    db.commit()

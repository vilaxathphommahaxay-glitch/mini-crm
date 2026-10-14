"""Shared fixtures.

Tests run on in-memory SQLite by default. Set TEST_DATABASE_URL to run them on PostgreSQL:
    TEST_DATABASE_URL=postgresql+psycopg://crm:crm@localhost:5432/crm_test pytest
"""

import os
from decimal import Decimal
from itertools import count

# Tests assert on Vientiane dates; don't let a developer's .env change that.
os.environ["APP_TIMEZONE"] = "Asia/Vientiane"

import pytest  # noqa: E402
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import clock, storage
from app.db import Base, get_db, make_engine
from app.main import app
from app.models import Activity, ActivityType, Company, Contact, Deal, Role, User
from app.ratelimit import account_limiter, client_limiter
from app.security import create_access_token, hash_password

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")
PASSWORD = "password123"
_PASSWORD_HASH = hash_password(PASSWORD)  # bcrypt is slow on purpose; hash once


@pytest.fixture(scope="session")
def engine():
    if TEST_DATABASE_URL == "sqlite://":
        # One shared in-memory connection, so the app and the test see the same data.
        eng = create_engine(
            "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
        )

        @event.listens_for(eng, "connect")
        def _enable_fks(dbapi_connection, _record):
            dbapi_connection.execute("PRAGMA foreign_keys=ON")
    else:
        eng = make_engine(TEST_DATABASE_URL)
    yield eng
    eng.dispose()


@pytest.fixture
def session_factory(engine):
    Base.metadata.create_all(engine)
    yield sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)
    Base.metadata.drop_all(engine)


@pytest.fixture
def db(session_factory):
    with session_factory() as session:
        yield session


@pytest.fixture
def client(session_factory):
    def _get_db():
        with session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = _get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture(autouse=True)
def _upload_dir(tmp_path):
    """Attached files go to a fresh temporary folder in every test."""
    storage.root_override = tmp_path / "uploads"
    yield storage.root_override
    storage.root_override = None


@pytest.fixture(autouse=True)
def _unfreeze_clock():
    yield
    clock.freeze(None)


@pytest.fixture(autouse=True)
def _reset_login_limiter():
    for limiter in (account_limiter, client_limiter):
        limiter.reset()
    yield
    for limiter in (account_limiter, client_limiter):
        limiter.reset()


_ids = count(1)


@pytest.fixture
def make_user(db):
    def _make(role: Role = Role.staff, **fields) -> User:
        n = next(_ids)
        user = User(
            name=fields.pop("name", f"User {n}"),
            email=fields.pop("email", f"user{n}@example.com"),
            password_hash=_PASSWORD_HASH,
            role=role,
            **fields,
        )
        db.add(user)
        db.commit()
        return user

    return _make


class Factory:
    """Creates rows straight in the database, with sensible defaults."""

    def __init__(self, db):
        self.db = db

    def _save(self, obj):
        self.db.add(obj)
        self.db.commit()
        return obj

    def company(self, owner: User, **fields) -> Company:
        return self._save(Company(name=fields.pop("name", "Acme"), owner_id=owner.id, **fields))

    def contact(self, owner: User, **fields) -> Contact:
        return self._save(
            Contact(first_name=fields.pop("first_name", "Noy"), owner_id=owner.id, **fields)
        )

    def deal(self, owner: User, contact: Contact | None = None, **fields) -> Deal:
        contact = contact or self.contact(owner)
        fields.setdefault("title", "Deal")
        fields.setdefault("value", Decimal("1000"))
        return self._save(Deal(contact_id=contact.id, owner_id=owner.id, **fields))

    def activity(self, owner: User, **fields) -> Activity:
        fields.setdefault("type", ActivityType.task)
        fields.setdefault("subject", "Follow up")
        return self._save(Activity(owner_id=owner.id, **fields))


@pytest.fixture
def factory(db) -> Factory:
    return Factory(db)


def auth(user: User) -> dict[str, str]:
    return {"Authorization": f"Bearer {create_access_token(user.id)}"}


@pytest.fixture
def admin(make_user) -> User:
    return make_user(Role.admin, name="Admin")


@pytest.fixture
def staff(make_user) -> User:
    return make_user(Role.staff, name="Staff A")


@pytest.fixture
def other_staff(make_user) -> User:
    return make_user(Role.staff, name="Staff B")

"""Shared fixtures.

Tests run on in-memory SQLite by default. Set TEST_DATABASE_URL to run them on PostgreSQL:
    TEST_DATABASE_URL=postgresql+psycopg://crm:crm@localhost:5432/crm_test pytest
"""

import os
from itertools import count

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import clock
from app.db import Base, get_db, make_engine
from app.main import app
from app.models import Role, User
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
def _unfreeze_clock():
    yield
    clock.freeze(None)


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

"""Shared fixtures.

Tests run on in-memory SQLite by default. Set TEST_DATABASE_URL to run them on PostgreSQL:
    TEST_DATABASE_URL=postgresql+psycopg://crm:crm@localhost:5432/crm_test pytest
"""

import os

import pytest
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import clock
from app.db import Base, make_engine

TEST_DATABASE_URL = os.environ.get("TEST_DATABASE_URL", "sqlite://")


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
def db(engine):
    Base.metadata.create_all(engine)
    session = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def _unfreeze_clock():
    yield
    clock.freeze(None)

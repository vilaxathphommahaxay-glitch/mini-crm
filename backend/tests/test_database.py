from datetime import timedelta
from pathlib import Path

from alembic import command
from alembic.autogenerate import compare_metadata
from alembic.config import Config
from alembic.migration import MigrationContext
from sqlalchemy import func, select

from app.db import Base, make_engine
from app.models import Activity, Contact, Deal, Stage, User
from app.seed import seed

BACKEND_DIR = Path(__file__).resolve().parents[1]


def test_migrations_match_models(tmp_path):
    engine = make_engine(f"sqlite:///{tmp_path / 'migrated.db'}")
    config = Config(str(BACKEND_DIR / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND_DIR / "alembic"))

    with engine.begin() as connection:
        config.attributes["connection"] = connection
        command.upgrade(config, "head")

    with engine.connect() as connection:
        diff = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    engine.dispose()

    assert diff == [], f"models changed without a migration: {diff}"


def test_seed_creates_sample_data(db):
    seed(db)

    assert db.scalar(select(func.count()).select_from(User)) == 3
    assert db.scalar(select(func.count()).select_from(Contact)) == 30
    stages = set(db.scalars(select(Deal.stage)))
    assert stages == set(Stage)
    # closed deals have closed_at, open deals don't
    for deal in db.scalars(select(Deal)):
        assert (deal.closed_at is not None) == (deal.stage in {Stage.won, Stage.lost})
    assert db.scalar(select(func.count()).where(Activity.due_date.is_not(None))) > 0


def test_datetimes_come_back_timezone_aware(db):
    seed(db)
    db.expire_all()

    user = db.scalars(select(User)).first()
    assert user.created_at.utcoffset() == timedelta(0)

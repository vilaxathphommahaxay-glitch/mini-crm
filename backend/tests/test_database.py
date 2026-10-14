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


def test_seed_languages_have_the_same_shape(db):
    """The Lao demo data must behave exactly like the English one, only with other words."""
    from app.seed import DATASETS

    en, lo = DATASETS["en"], DATASETS["lo"]
    assert set(en) == set(lo)
    for key in en:
        if isinstance(en[key], list):
            assert len(en[key]) == len(lo[key]), key
        elif isinstance(en[key], dict):
            assert set(en[key]) == set(lo[key]), key
            for k, v in en[key].items():
                if isinstance(v, list):
                    assert len(v) == len(lo[key][k]), (key, k)
    assert "{n}" in lo["repeat_order"]


def test_lao_seed_creates_the_same_amount_of_data(db):
    seed(db, language="lo")

    assert db.scalar(select(func.count()).select_from(User)) == 3
    assert db.scalar(select(func.count()).select_from(Contact)) == 30
    names = list(db.scalars(select(User.name)))
    assert any("຀" <= ch <= "໿" for name in names for ch in name)
    # logins stay the same whatever the language
    assert set(db.scalars(select(User.email))) == {
        "admin@example.com",
        "somchai@example.com",
        "keo@example.com",
    }

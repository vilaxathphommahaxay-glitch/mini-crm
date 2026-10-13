import enum
from datetime import date, datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    Enum,
    ForeignKey,
    Index,
    Integer,
    Numeric,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.clock import utcnow
from app.db import Base, UTCDateTime


class Role(enum.StrEnum):
    admin = "admin"
    staff = "staff"


class Currency(enum.StrEnum):
    LAK = "LAK"
    THB = "THB"
    USD = "USD"


class Stage(enum.StrEnum):
    lead = "lead"
    qualified = "qualified"
    proposal = "proposal"
    negotiation = "negotiation"
    won = "won"
    lost = "lost"


STAGES: list[Stage] = list(Stage)
CLOSED_STAGES = {Stage.won, Stage.lost}


class ActivityType(enum.StrEnum):
    call = "call"
    meeting = "meeting"
    note = "note"
    task = "task"


def _enum(cls: type[enum.Enum]) -> Enum:
    # VARCHAR + CHECK instead of a native enum type: identical on SQLite and PostgreSQL.
    return Enum(cls, native_enum=False, length=20, values_callable=lambda e: [m.value for m in e])


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, onupdate=utcnow, nullable=False
    )


class User(TimestampMixin, Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(_enum(Role), default=Role.staff)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)


class Company(TimestampMixin, Base):
    __tablename__ = "companies"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(50))
    address: Mapped[str | None] = mapped_column(Text)
    website: Mapped[str | None] = mapped_column(String(255))
    notes: Mapped[str | None] = mapped_column(Text)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    owner: Mapped[User] = relationship()


contact_tags = Table(
    "contact_tags",
    Base.metadata,
    Column("contact_id", ForeignKey("contacts.id", ondelete="CASCADE"), primary_key=True),
    Column("tag_id", ForeignKey("tags.id", ondelete="CASCADE"), primary_key=True),
)


class Tag(Base):
    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50), unique=True)


class Contact(TimestampMixin, Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str | None] = mapped_column(String(100))
    email: Mapped[str | None] = mapped_column(String(255), index=True)
    phone: Mapped[str | None] = mapped_column(String(50))
    notes: Mapped[str | None] = mapped_column(Text)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    company: Mapped[Company | None] = relationship()
    owner: Mapped[User] = relationship()
    tags: Mapped[list[Tag]] = relationship(secondary=contact_tags, order_by=Tag.name)

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name or ''}".strip()


class Deal(TimestampMixin, Base):
    __tablename__ = "deals"
    __table_args__ = (
        CheckConstraint("value >= 0", name="value_non_negative"),
        Index("ix_deals_stage_position", "stage", "position"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    value: Mapped[Decimal] = mapped_column(Numeric(18, 2))
    currency: Mapped[Currency] = mapped_column(_enum(Currency), default=Currency.LAK)
    stage: Mapped[Stage] = mapped_column(_enum(Stage), default=Stage.lead)
    position: Mapped[int] = mapped_column(Integer, default=0)
    contact_id: Mapped[int] = mapped_column(ForeignKey("contacts.id"), index=True)
    company_id: Mapped[int | None] = mapped_column(ForeignKey("companies.id"), index=True)
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    expected_close_date: Mapped[date | None] = mapped_column(Date)
    closed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)

    contact: Mapped[Contact] = relationship()
    company: Mapped[Company | None] = relationship()
    owner: Mapped[User] = relationship()


class Activity(TimestampMixin, Base):
    __tablename__ = "activities"
    __table_args__ = (Index("ix_activities_due_date_done", "due_date", "done"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[ActivityType] = mapped_column(_enum(ActivityType))
    subject: Mapped[str] = mapped_column(String(200))
    description: Mapped[str | None] = mapped_column(Text)
    due_date: Mapped[date | None] = mapped_column(Date)
    done: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime | None] = mapped_column(UTCDateTime)
    contact_id: Mapped[int | None] = mapped_column(
        ForeignKey("contacts.id", ondelete="CASCADE"), index=True
    )
    deal_id: Mapped[int | None] = mapped_column(
        ForeignKey("deals.id", ondelete="SET NULL"), index=True
    )
    owner_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)

    contact: Mapped[Contact | None] = relationship(passive_deletes=True)
    deal: Mapped[Deal | None] = relationship(passive_deletes=True)
    owner: Mapped[User] = relationship()

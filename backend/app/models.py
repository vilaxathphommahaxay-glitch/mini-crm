import enum
from datetime import date, datetime
from decimal import ROUND_HALF_UP, Decimal

from sqlalchemy import (
    JSON,
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

    @property
    def tag_names(self) -> list[str]:
        return [tag.name for tag in self.tags]


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


def cents(amount: Decimal) -> Decimal:
    """Round money the way people do on paper: to 2 decimals, halves up."""
    return amount.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


class BusinessProfile(TimestampMixin, Base):
    """The seller's details printed on quotations. A single row (id 1), edited by admins."""

    __tablename__ = "business_profile"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(Text)
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(255))
    tax_id: Mapped[str | None] = mapped_column(String(50))
    quote_terms: Mapped[str | None] = mapped_column(Text)


class QuoteCounter(Base):
    """Last quote number used per year, so a deleted quote's number is never handed out again."""

    __tablename__ = "quote_counters"

    year: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)
    last: Mapped[int] = mapped_column(Integer)


class Quote(TimestampMixin, Base):
    """A priced offer for a deal. Access follows the deal; amounts are in the quote's currency."""

    __tablename__ = "quotes"
    __table_args__ = (
        CheckConstraint("discount >= 0", name="discount_non_negative"),
        CheckConstraint("tax_rate >= 0 AND tax_rate <= 100", name="tax_rate_percent"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(20), unique=True)
    deal_id: Mapped[int] = mapped_column(ForeignKey("deals.id", ondelete="CASCADE"), index=True)
    currency: Mapped[Currency] = mapped_column(_enum(Currency))
    issue_date: Mapped[date] = mapped_column(Date)
    valid_until: Mapped[date | None] = mapped_column(Date)
    discount: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=Decimal(0))
    tax_rate: Mapped[Decimal] = mapped_column(Numeric(5, 2), default=Decimal(0))
    notes: Mapped[str | None] = mapped_column(Text)

    deal: Mapped[Deal] = relationship()
    items: Mapped[list["QuoteItem"]] = relationship(
        order_by="QuoteItem.position", cascade="all, delete-orphan", passive_deletes=True
    )

    @property
    def subtotal(self) -> Decimal:
        return sum((item.amount for item in self.items), Decimal(0))

    @property
    def tax(self) -> Decimal:
        return cents((self.subtotal - self.discount) * self.tax_rate / 100)

    @property
    def total(self) -> Decimal:
        return self.subtotal - self.discount + self.tax


class QuoteItem(Base):
    __tablename__ = "quote_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="quantity_positive"),
        CheckConstraint("unit_price >= 0", name="unit_price_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    quote_id: Mapped[int] = mapped_column(ForeignKey("quotes.id", ondelete="CASCADE"), index=True)
    position: Mapped[int] = mapped_column(Integer)
    description: Mapped[str] = mapped_column(String(500))
    quantity: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    unit_price: Mapped[Decimal] = mapped_column(Numeric(18, 2))

    @property
    def amount(self) -> Decimal:
        return cents(self.quantity * self.unit_price)


class AuditEvent(Base):
    """One change to a record: who, when, what (see app/audit.py, which writes these)."""

    __tablename__ = "audit_events"
    __table_args__ = (Index("ix_audit_events_entity", "entity_type", "entity_id"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        UTCDateTime, default=utcnow, nullable=False, index=True
    )
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"))
    entity_type: Mapped[str] = mapped_column(String(20))
    entity_id: Mapped[int] = mapped_column(Integer)
    # the record's name at the time, so the entry still reads well after it is deleted
    entity_label: Mapped[str] = mapped_column(String(200))
    action: Mapped[str] = mapped_column(String(20))
    changes: Mapped[list | None] = mapped_column(JSON)

    actor: Mapped[User | None] = relationship()

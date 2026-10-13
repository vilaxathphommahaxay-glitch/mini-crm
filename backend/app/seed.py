"""Sample data for development and the Docker demo.

python -m app.seed            # seed only if the database is empty
python -m app.seed --reset    # wipe all data, then seed
"""

import argparse
import random
from datetime import timedelta
from decimal import Decimal

from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.clock import local_today, utcnow
from app.db import SessionLocal
from app.models import (
    CLOSED_STAGES,
    Activity,
    ActivityType,
    Company,
    Contact,
    Currency,
    Deal,
    Role,
    Stage,
    Tag,
    User,
    contact_tags,
)
from app.security import hash_password

# Documented in README — demo only.
SEED_USERS = [
    ("Admin", "admin@example.com", "admin123", Role.admin),
    ("Somchai Vongsa", "somchai@example.com", "staff123", Role.staff),
    ("Keo Phommachanh", "keo@example.com", "staff123", Role.staff),
]

COMPANY_NAMES = [
    "Vientiane Coffee House",
    "Mekong Trading",
    "Luang Prabang Crafts",
    "Champa Hotel",
    "Lao Fresh Market",
    "Pakse Motors",
    "Sabaidee Travel",
    "Nam Ngum Water",
    "Golden Rice Co.",
    "That Luang Printing",
]

FIRST_NAMES = [
    "Bounmy", "Chanthala", "Daovone", "Khamla", "Latsamy", "Manivone", "Noy", "Phet",
    "Sengphet", "Souksavanh", "Thongdy", "Vanh", "Viengkham", "Xayasith", "Anousone",
]  # fmt: skip
LAST_NAMES = [
    "Keomany", "Phommasack", "Sayavong", "Inthavong", "Douangdy", "Sisouk", "Vilayvong",
    "Rattanavong", "Chanthavong", "Souvannavong", None,
]  # fmt: skip
TAGS = ["vip", "wholesale", "retail", "new", "follow-up", "hotel"]

DEAL_TITLES = [
    "Coffee machine lease", "Annual supply contract", "Website redesign", "Staff uniforms",
    "Catering for event", "Delivery van", "POS system", "Room booking package",
    "Bulk rice order", "Brochure printing", "Water dispenser rental", "Tour package",
    "Office furniture", "Wedding banquet", "Signage and banners", "Cold storage unit",
    "Loyalty card program", "Solar panels", "Motorbike fleet service", "Corporate gift boxes",
]  # fmt: skip

ACTIVITY_SUBJECTS = {
    ActivityType.call: ["Intro call", "Follow-up call", "Price check call"],
    ActivityType.meeting: ["Site visit", "Demo meeting", "Contract review"],
    ActivityType.note: ["Prefers LINE over email", "Budget approved", "Asked for discount"],
    ActivityType.task: [
        "Send quotation",
        "Prepare contract",
        "Call back about delivery",
        "Send product samples",
        "Confirm payment",
    ],
}


def is_empty(db: Session) -> bool:
    return db.scalar(select(User.id).limit(1)) is None


def wipe(db: Session) -> None:
    for table in (Activity, Deal, contact_tags, Contact, Tag, Company, User):
        db.execute(delete(table))
    db.commit()


def seed(db: Session, rng: random.Random | None = None) -> None:
    rng = rng or random.Random(42)
    now = utcnow()
    today = local_today()

    users = [
        User(name=name, email=email, password_hash=hash_password(pw), role=role)
        for name, email, pw, role in SEED_USERS
    ]
    db.add_all(users)
    staff = [u for u in users if u.role == Role.staff]
    owners = staff + users[:1]  # most data belongs to staff, some to admin

    tags = {name: Tag(name=name) for name in TAGS}
    db.add_all(tags.values())

    companies = [
        Company(
            name=name,
            phone=f"+856 21 {rng.randint(200000, 999999)}",
            address=rng.choice(["Vientiane", "Luang Prabang", "Pakse", "Savannakhet"]),
            website=f"https://{name.lower().replace(' ', '').replace('.', '')}.la",
            owner=owners[i % len(owners)],
        )
        for i, name in enumerate(COMPANY_NAMES)
    ]
    db.add_all(companies)

    contacts = []
    for i in range(30):
        company = companies[i % len(companies)] if i < 24 else None
        owner = company.owner if company else owners[i % len(owners)]
        first = FIRST_NAMES[i % len(FIRST_NAMES)]
        last = LAST_NAMES[(i * 7) % len(LAST_NAMES)]
        contacts.append(
            Contact(
                first_name=first,
                last_name=last,
                email=f"{first.lower()}{i}@example.la" if i % 5 != 4 else None,
                phone=f"+856 20 {rng.randint(10000000, 99999999)}",
                company=company,
                owner=owner,
                tags=rng.sample(list(tags.values()), k=rng.randint(0, 2)),
            )
        )
    db.add_all(contacts)

    positions = dict.fromkeys(Stage, 0)
    deals = []
    for i in range(20):
        contact = contacts[(i * 3) % len(contacts)]
        stage = list(Stage)[i % len(Stage)]
        currency = Currency.LAK if i % 4 else rng.choice([Currency.THB, Currency.USD])
        value = {
            Currency.LAK: Decimal(rng.randint(5, 300) * 100_000),
            Currency.THB: Decimal(rng.randint(5, 200) * 1_000),
            Currency.USD: Decimal(rng.randint(5, 100) * 50),
        }[currency]
        closed_at = None
        if stage in CLOSED_STAGES:
            # recently closed, so they show on the board (it hides wins/losses older than 90 days)
            closed_at = now - timedelta(days=rng.randint(0, 60))
        deals.append(
            Deal(
                title=DEAL_TITLES[i % len(DEAL_TITLES)],
                value=value,
                currency=currency,
                stage=stage,
                position=positions[stage],
                contact=contact,
                company=contact.company,
                owner=contact.owner,
                expected_close_date=today + timedelta(days=rng.randint(7, 90)),
                closed_at=closed_at,
            )
        )
        positions[stage] += 1

    # A few extra won deals so every month of the dashboard chart has something.
    for months_ago in range(12):
        contact = rng.choice(contacts)
        deals.append(
            Deal(
                title=f"Repeat order #{months_ago + 1}",
                value=Decimal(rng.randint(10, 150) * 100_000),
                currency=Currency.LAK,
                stage=Stage.won,
                position=positions[Stage.won],
                contact=contact,
                company=contact.company,
                owner=contact.owner,
                closed_at=now - timedelta(days=30 * months_ago + rng.randint(0, 5)),
            )
        )
        positions[Stage.won] += 1
    db.add_all(deals)

    # Tasks: overdue / today / upcoming / later / done. Other types are past events.
    due_offsets = [-10, -4, -2, -1, 0, 0, 0, 1, 3, 5, 7, 14, 20]
    activities = []
    for i in range(40):
        deal = deals[i % 20] if i % 3 == 0 else None
        contact = deal.contact if deal else contacts[i % len(contacts)]
        kind = ActivityType.task if i < len(due_offsets) + 5 else list(ActivityType)[i % 3]
        due_date = None
        done = False
        if kind == ActivityType.task:
            if i < len(due_offsets):
                due_date = today + timedelta(days=due_offsets[i])
            else:  # already finished tasks
                due_date = today - timedelta(days=rng.randint(1, 20))
                done = True
        activities.append(
            Activity(
                type=kind,
                subject=rng.choice(ACTIVITY_SUBJECTS[kind]),
                description=None if i % 2 else "Details discussed with the customer.",
                due_date=due_date,
                done=done,
                completed_at=now - timedelta(days=rng.randint(0, 3)) if done else None,
                contact=contact,
                deal=deal,
                owner=contact.owner,
                created_at=now - timedelta(days=rng.randint(1, 60), hours=rng.randint(0, 23)),
            )
        )
    db.add_all(activities)
    db.commit()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed sample data")
    parser.add_argument("--reset", action="store_true", help="delete all data first")
    args = parser.parse_args()

    with SessionLocal() as db:
        if args.reset:
            wipe(db)
        elif not is_empty(db):
            print("Database already has data - skipping (use --reset to start over).")
            return
        seed(db)
        print("Seeded sample data. Demo logins are listed in README.md.")


if __name__ == "__main__":
    main()

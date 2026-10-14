"""Sample data for development and the Docker demo.

python -m app.seed                 # seed only if the database is empty
python -m app.seed --reset         # wipe all data, then seed
python -m app.seed --language lo   # Lao names, companies, deals and notes (or SEED_LANGUAGE=lo)
"""

import argparse
import os
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
    BusinessProfile,
    Company,
    Contact,
    Currency,
    Deal,
    Quote,
    QuoteCounter,
    QuoteItem,
    Role,
    Stage,
    Tag,
    User,
    contact_tags,
)
from app.security import hash_password

# Logins are documented in README — demo only. Emails and passwords are the same in every language.
LOGINS = [
    ("admin@example.com", "admin123", Role.admin),
    ("somchai@example.com", "staff123", Role.staff),
    ("keo@example.com", "staff123", Role.staff),
]

# Everything a person reads in the demo data, per language. The numbers, dates and shape of the
# data are identical, so the app behaves the same whichever language you seed.
DATASETS = {
    "en": {
        "user_names": ["Admin", "Somchai Vongsa", "Keo Phommachanh"],
        "business": {
            "name": "Mini CRM Demo Shop",
            "address": "Lane Xang Avenue\nVientiane, Laos",
            "phone": "+856 21 212 345",
            "email": "sales@example.la",
            "quote_terms": "Prices include delivery within Vientiane.\n"
            "Please pay by bank transfer to BCEL 010-12-00-0000000 (demo account).",
        },
        "companies": [
            ("Vientiane Coffee House", "vientianecoffeehouse"),
            ("Mekong Trading", "mekongtrading"),
            ("Luang Prabang Crafts", "luangprabangcrafts"),
            ("Champa Hotel", "champahotel"),
            ("Lao Fresh Market", "laofreshmarket"),
            ("Pakse Motors", "paksemotors"),
            ("Sabaidee Travel", "sabaideetravel"),
            ("Nam Ngum Water", "namngumwater"),
            ("Golden Rice Co.", "goldenriceco"),
            ("That Luang Printing", "thatluangprinting"),
        ],
        "first_names": [
            "Bounmy",
            "Chanthala",
            "Daovone",
            "Khamla",
            "Latsamy",
            "Manivone",
            "Noy",
            "Phet",
            "Sengphet",
            "Souksavanh",
            "Thongdy",
            "Vanh",
            "Viengkham",
            "Xayasith",
            "Anousone",
        ],  # fmt: skip
        "last_names": [
            "Keomany",
            "Phommasack",
            "Sayavong",
            "Inthavong",
            "Douangdy",
            "Sisouk",
            "Vilayvong",
            "Rattanavong",
            "Chanthavong",
            "Souvannavong",
            None,
        ],  # fmt: skip
        "tags": ["vip", "wholesale", "retail", "new", "follow-up", "hotel"],
        "cities": ["Vientiane", "Luang Prabang", "Pakse", "Savannakhet"],
        "deal_titles": [
            "Coffee machine lease",
            "Annual supply contract",
            "Website redesign",
            "Staff uniforms",
            "Catering for event",
            "Delivery van",
            "POS system",
            "Room booking package",
            "Bulk rice order",
            "Brochure printing",
            "Water dispenser rental",
            "Tour package",
            "Office furniture",
            "Wedding banquet",
            "Signage and banners",
            "Cold storage unit",
            "Loyalty card program",
            "Solar panels",
            "Motorbike fleet service",
            "Corporate gift boxes",
        ],  # fmt: skip
        "repeat_order": "Repeat order #{n}",
        "description": "Details discussed with the customer.",
        "activities": {
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
        },
    },
    "lo": {
        "user_names": ["ຜູ້ດູແລລະບົບ", "ສົມໃຈ ວົງສາ", "ແກ້ວ ພົມມະຈັນ"],
        "business": {
            "name": "ຮ້ານຕົວຢ່າງ Mini CRM",
            "address": "ຖະໜົນລ້ານຊ້າງ\nນະຄອນຫຼວງວຽງຈັນ",
            "phone": "+856 21 212 345",
            "email": "sales@example.la",
            "quote_terms": "ລາຄານີ້ລວມຄ່າຂົນສົ່ງພາຍໃນນະຄອນຫຼວງວຽງຈັນແລ້ວ.\n"
            "ກະລຸນາໂອນເງິນເຂົ້າບັນຊີ BCEL 010-12-00-0000000 (ບັນຊີຕົວຢ່າງ).",
        },
        "companies": [
            ("ຮ້ານກາເຟວຽງຈັນ", "vientianecoffeehouse"),
            ("ແມ່ຂອງ ການຄ້າ", "mekongtrading"),
            ("ເຄື່ອງຫັດຖະກຳຫຼວງພະບາງ", "luangprabangcrafts"),
            ("ໂຮງແຮມຈຳປາ", "champahotel"),
            ("ຕະຫຼາດສົດລາວ", "laofreshmarket"),
            ("ປາກເຊ ມໍເຕີ", "paksemotors"),
            ("ສະບາຍດີ ທ່ອງທ່ຽວ", "sabaideetravel"),
            ("ນ້ຳງື່ມ ນ້ຳດື່ມ", "namngumwater"),
            ("ເຂົ້າຄຳ ຈຳກັດ", "goldenriceco"),
            ("ໂຮງພິມທາດຫຼວງ", "thatluangprinting"),
        ],
        "first_names": [
            "ບຸນມີ",
            "ຈັນທະລາ",
            "ດາວອນ",
            "ຄຳລາ",
            "ລັດສະໝີ",
            "ມະນີວອນ",
            "ນ້ອຍ",
            "ເພັດ",
            "ແສງເພັດ",
            "ສຸກສະຫວັນ",
            "ທອງດີ",
            "ວັນ",
            "ວຽງຄຳ",
            "ໄຊຍະສິດ",
            "ອານຸສອນ",
        ],  # fmt: skip
        "last_names": [
            "ແກ້ວມະນີ",
            "ພົມມະສັກ",
            "ສາຍະວົງ",
            "ອິນທະວົງ",
            "ດວງດີ",
            "ສີສຸກ",
            "ວິໄລວົງ",
            "ຣັດຕະນະວົງ",
            "ຈັນທະວົງ",
            "ສຸວັນນະວົງ",
            None,
        ],  # fmt: skip
        "tags": ["ລູກຄ້າສຳຄັນ", "ຂາຍສົ່ງ", "ຂາຍຍ່ອຍ", "ລູກຄ້າໃໝ່", "ຕ້ອງຕິດຕາມ", "ໂຮງແຮມ"],
        "cities": ["ວຽງຈັນ", "ຫຼວງພະບາງ", "ປາກເຊ", "ສະຫວັນນະເຂດ"],
        "deal_titles": [
            "ເຊົ່າເຄື່ອງຊົງກາເຟ",
            "ສັນຍາສະໜອງປະຈຳປີ",
            "ອອກແບບເວັບໄຊ",
            "ເຄື່ອງແບບພະນັກງານ",
            "ຈັດງານລ້ຽງ",
            "ລົດຕູ້ສົ່ງເຄື່ອງ",
            "ລະບົບຂາຍໜ້າຮ້ານ (POS)",
            "ແພັກເກດຫ້ອງພັກ",
            "ເຂົ້າສານຈຳນວນຫຼາຍ",
            "ພິມແຜ່ນພັບ",
            "ເຊົ່າຕູ້ນ້ຳດື່ມ",
            "ແພັກເກດທ່ອງທ່ຽວ",
            "ເຄື່ອງເຟີນິເຈີຫ້ອງການ",
            "ງານແຕ່ງດອງ",
            "ປ້າຍໂຄສະນາ",
            "ຫ້ອງເຢັນເກັບສິນຄ້າ",
            "ໂປຣແກຣມບັດສະມາຊິກ",
            "ແຜງໂຊລາ",
            "ບໍລິການລົດຈັກ",
            "ກ່ອງຂອງຂວັນບໍລິສັດ",
        ],  # fmt: skip
        "repeat_order": "ສັ່ງຊື້ຊ້ຳ #{n}",
        "description": "ໄດ້ປຶກສາຫາລືກັບລູກຄ້າແລ້ວ.",
        "activities": {
            ActivityType.call: ["ໂທຫາຄັ້ງທຳອິດ", "ໂທຕິດຕາມ", "ໂທສອບຖາມລາຄາ"],
            ActivityType.meeting: ["ໄປເບິ່ງສະຖານທີ່", "ນັດສາທິດສິນຄ້າ", "ທົບທວນສັນຍາ"],
            ActivityType.note: ["ມັກຕິດຕໍ່ທາງໂທລະສັບ", "ເຈົ້າຂອງອະນຸມັດງົບແລ້ວ", "ຂໍຕໍ່ລາຄາ"],
            ActivityType.task: [
                "ສົ່ງໃບສະເໜີລາຄາ",
                "ກະກຽມສັນຍາ",
                "ໂທຕິດຕາມການສົ່ງເຄື່ອງ",
                "ສົ່ງຕົວຢ່າງສິນຄ້າ",
                "ຢືນຢັນການຊຳລະເງິນ",
            ],
        },
    },
}

# Email addresses stay Latin in every language (they are the same people either way).
EMAIL_NAMES = [
    "bounmy", "chanthala", "daovone", "khamla", "latsamy", "manivone", "noy", "phet",
    "sengphet", "souksavanh", "thongdy", "vanh", "viengkham", "xayasith", "anousone",
]  # fmt: skip


def is_empty(db: Session) -> bool:
    return db.scalar(select(User.id).limit(1)) is None


def wipe(db: Session) -> None:
    for table in (
        QuoteItem,
        Quote,
        QuoteCounter,
        BusinessProfile,
        Activity,
        Deal,
        contact_tags,
        Contact,
        Tag,
        Company,
        User,
    ):
        db.execute(delete(table))
    db.commit()


def _backdate(rows, rng: random.Random, now, max_days: int) -> None:
    """Give demo rows a believable history instead of all being created "today"."""
    for row in rows:
        age = timedelta(days=rng.randint(max_days // 2, max_days), hours=rng.randint(0, 23))
        created = now - age
        row.created_at = created
        row.updated_at = min(now, created + timedelta(days=rng.randint(0, max_days // 2)))


def seed(db: Session, rng: random.Random | None = None, language: str = "en") -> None:
    data = DATASETS[language]
    rng = rng or random.Random(42)
    now = utcnow()
    today = local_today()

    users = [
        User(name=name, email=email, password_hash=hash_password(pw), role=role)
        for name, (email, pw, role) in zip(data["user_names"], LOGINS, strict=True)
    ]
    db.add_all(users)
    db.add(BusinessProfile(id=1, **data["business"]))
    staff = [u for u in users if u.role == Role.staff]
    owners = staff + users[:1]  # most data belongs to staff, some to admin

    tags = {name: Tag(name=name) for name in data["tags"]}
    db.add_all(tags.values())

    companies = [
        Company(
            name=name,
            phone=f"+856 21 {rng.randint(200000, 999999)}",
            address=rng.choice(data["cities"]),
            website=f"https://{slug}.la",
            owner=owners[i % len(owners)],
        )
        for i, (name, slug) in enumerate(data["companies"])
    ]
    _backdate(companies, rng, now, 300)
    db.add_all(companies)

    contacts = []
    for i in range(30):
        company = companies[i % len(companies)] if i < 24 else None
        owner = company.owner if company else owners[i % len(owners)]
        n = i % len(data["first_names"])
        first = data["first_names"][n]
        last = data["last_names"][(i * 7) % len(data["last_names"])]
        contacts.append(
            Contact(
                first_name=first,
                last_name=last,
                email=f"{EMAIL_NAMES[n]}{i}@example.la" if i % 5 != 4 else None,
                phone=f"+856 20 {rng.randint(10000000, 99999999)}",
                company=company,
                owner=owner,
                tags=rng.sample(list(tags.values()), k=rng.randint(0, 2)),
            )
        )
    _backdate(contacts, rng, now, 200)
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
                title=data["deal_titles"][i % len(data["deal_titles"])],
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
                title=data["repeat_order"].format(n=months_ago + 1),
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
    _backdate(deals, rng, now, 90)
    for deal in deals:  # a deal can't have been closed before it existed
        if deal.closed_at is not None:
            deal.created_at = min(deal.created_at, deal.closed_at - timedelta(days=7))
            deal.updated_at = max(deal.updated_at, deal.closed_at)
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
                subject=rng.choice(data["activities"][kind]),
                description=None if i % 2 else data["description"],
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
    parser.add_argument(
        "--language",
        choices=sorted(DATASETS),
        default=os.environ.get("SEED_LANGUAGE", "en"),
        help="language of the sample names and text (default: $SEED_LANGUAGE or en)",
    )
    args = parser.parse_args()
    if args.language not in DATASETS:
        parser.error(f"unknown language {args.language!r}; choose from {sorted(DATASETS)}")

    with SessionLocal() as db:
        if args.reset:
            wipe(db)
        elif not is_empty(db):
            print("Database already has data - skipping (use --reset to start over).")
            return
        seed(db, language=args.language)
        print("Seeded sample data. Demo logins are listed in README.md.")


if __name__ == "__main__":
    main()

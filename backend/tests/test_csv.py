import csv
import io

from sqlalchemy import select

from app import csv_io
from app.models import Company, Contact
from tests.conftest import auth

HEADER = "first_name,last_name,email,phone,company,tags,notes\n"


def upload(client, user, text: str | bytes, name="contacts.csv"):
    data = text.encode() if isinstance(text, str) else text
    return client.post(
        "/api/contacts/import", headers=auth(user), files={"file": (name, data, "text/csv")}
    )


def test_import_creates_contacts_tags_and_companies(client, db, factory, staff):
    factory.company(staff, name="Mekong Trading")
    text = HEADER + (
        "Bounmy,Keomany,BOUNMY@example.la,+856 20 1,mekong trading,VIP;wholesale,Likes tea\n"
        "Noy,,,,New Shop,,\n"
    )

    response = upload(client, staff, text)

    body = response.json()
    assert response.status_code == 200, body
    assert body == {"created": 2, "skipped": 0, "companies_created": 1, "errors": []}
    contacts = {c.first_name: c for c in db.scalars(select(Contact))}
    assert contacts["Bounmy"].email == "bounmy@example.la"
    assert contacts["Bounmy"].company.name == "Mekong Trading"  # matched case-insensitively
    assert contacts["Bounmy"].tag_names == ["vip", "wholesale"]
    assert contacts["Noy"].company.name == "New Shop"
    assert all(c.owner_id == staff.id for c in contacts.values())


def test_import_accepts_bom_and_lao_text(client, db, staff):
    text = "﻿" + HEADER + "ສົມໃຈ,ວົງສາ,,,,,\n"

    body = upload(client, staff, text.encode("utf-8")).json()

    assert body["created"] == 1
    assert db.scalar(select(Contact.first_name)) == "ສົມໃຈ"


def test_bad_and_duplicate_rows_are_skipped_and_reported(client, factory, staff):
    factory.contact(staff, email="taken@example.la")
    text = HEADER + (
        "Good,,good@example.la,,,,\n"  # line 2
        ",,missing-first-name@example.la,,,,\n"  # line 3
        "Bad,,not-an-email,,,,\n"  # line 4
        "Dup,,TAKEN@example.la,,,,\n"  # line 5
        "Twice,,good@example.la,,,,\n"  # line 6: duplicate within the file
        ",,,,,,\n"  # blank line: ignored
    )

    body = upload(client, staff, text).json()

    assert body["created"] == 1
    assert body["skipped"] == 4
    rows = {e["row"]: e["message"] for e in body["errors"]}
    assert set(rows) == {3, 4, 5, 6}
    assert "first_name" in rows[3]
    assert "email" in rows[4]
    assert "Duplicate" in rows[5] and "Duplicate" in rows[6]


def test_duplicates_only_count_contacts_the_user_can_see(client, factory, staff, other_staff):
    factory.contact(other_staff, email="shared@example.la")

    body = upload(client, staff, HEADER + "Mine,,shared@example.la,,,,\n").json()

    assert body["created"] == 1


def test_company_match_ignores_other_staff_companies(client, db, factory, staff, other_staff):
    factory.company(other_staff, name="Their Co")

    body = upload(client, staff, HEADER + "A,,,,Their Co,,\n").json()

    assert body["companies_created"] == 1
    owners = {c.owner_id for c in db.scalars(select(Company).where(Company.name == "Their Co"))}
    assert owners == {staff.id, other_staff.id}


def test_whole_file_errors(client, staff):
    no_first_name = upload(client, staff, "name,email\nA,a@example.la\n")
    not_utf8 = upload(client, staff, (HEADER + "Ånder,,,,,,\n").encode("latin-1"))
    empty = upload(client, staff, "")

    assert no_first_name.status_code == 422
    assert "first_name" in no_first_name.json()["error"]["message"]
    assert not_utf8.status_code == 422
    assert "UTF-8" in not_utf8.json()["error"]["message"]
    assert empty.status_code == 422


def test_limits(client, staff, monkeypatch):
    monkeypatch.setattr(csv_io, "MAX_ROWS", 2)
    too_many = upload(client, staff, HEADER + "A,,,,,,\nB,,,,,,\nC,,,,,,\n")
    monkeypatch.setattr(csv_io, "MAX_BYTES", 10)
    too_big = upload(client, staff, HEADER)

    assert too_many.status_code == 422
    assert too_big.status_code == 413


def test_export_respects_filters_and_scope(client, factory, staff, other_staff):
    company = factory.company(staff, name="Champa Hotel")
    factory.contact(staff, first_name="ສົມໃຈ", email="s@example.la", company_id=company.id)
    factory.contact(staff, first_name="Other")
    factory.contact(other_staff, first_name="Hidden")

    all_mine = client.get("/api/contacts/export", headers=auth(staff))
    searched = client.get("/api/contacts/export?search=champa", headers=auth(staff))

    assert all_mine.status_code == 200
    assert all_mine.headers["content-type"].startswith("text/csv")
    assert "attachment" in all_mine.headers["content-disposition"]
    raw = all_mine.content.decode("utf-8")
    assert raw.startswith("﻿")  # BOM for Excel
    rows = list(csv.DictReader(io.StringIO(raw.lstrip("﻿"))))
    assert sorted(r["first_name"] for r in rows) == ["Other", "ສົມໃຈ"]
    found = list(csv.DictReader(io.StringIO(searched.content.decode("utf-8-sig"))))
    assert [r["company"] for r in found] == ["Champa Hotel"]


def test_export_neutralises_formulas_but_keeps_phone_numbers(client, factory, staff):
    factory.contact(staff, first_name="=HYPERLINK(1)", phone="+856 20 5555", notes="@cmd")

    raw = client.get("/api/contacts/export", headers=auth(staff)).content.decode("utf-8-sig")
    row = next(csv.DictReader(io.StringIO(raw)))

    assert row["first_name"] == "'=HYPERLINK(1)"
    assert row["notes"] == "'@cmd"
    assert row["phone"] == "+856 20 5555"


def test_export_then_import_round_trip(client, db, factory, staff, other_staff):
    company = factory.company(staff, name="Golden Rice Co.")
    original = client.post(
        "/api/contacts",
        headers=auth(staff),
        json={
            "first_name": "Keo",
            "last_name": "Sisouk",
            "email": "keo@example.la",
            "company_id": company.id,
            "tags": ["vip", "new"],
            "notes": "multi\nline, with comma",
        },
    )
    assert original.status_code == 201
    exported = client.get("/api/contacts/export", headers=auth(staff)).content

    body = upload(client, other_staff, exported).json()

    assert body["created"] == 1, body
    copy = db.scalars(select(Contact).where(Contact.owner_id == other_staff.id)).one()
    assert (copy.first_name, copy.last_name, copy.email) == ("Keo", "Sisouk", "keo@example.la")
    assert copy.tag_names == ["new", "vip"]
    assert copy.notes == "multi\nline, with comma"
    assert copy.company.name == "Golden Rice Co."

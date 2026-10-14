from app.duplicates import phone_key
from app.models import Stage
from tests.conftest import auth


def test_phone_numbers_in_any_format_match():
    same = {"+856 20 5555 1234", "020 5555 1234", "020-5555-1234", "8562055551234", "20 5555 1234"}
    assert {phone_key(p) for p in same} == {"8562055551234"}
    assert phone_key("+66 81 234 5678") == "66812345678"
    assert phone_key("123") is None
    assert phone_key(None) is None


def test_finds_groups_by_phone_email_and_full_name(client, factory, staff, other_staff):
    a = factory.contact(staff, first_name="Noy", last_name="Keo", phone="+856 20 5555 1234")
    b = factory.contact(staff, first_name="Noy K", phone="020 5555 1234")
    c = factory.contact(staff, first_name="noy", last_name=" keo ")  # same full name as a
    d = factory.contact(staff, first_name="Bounmy", email="b@example.la")
    e = factory.contact(staff, first_name="Bounmy V", email="B@Example.la")
    factory.contact(staff, first_name="Noy")  # first name alone is not enough
    factory.contact(other_staff, first_name="Noy", last_name="Keo")  # not visible to staff
    factory.deal(staff, contact=b)

    groups = client.get("/api/contacts/duplicates", headers=auth(staff)).json()

    assert [[x["id"] for x in g["contacts"]] for g in groups] == [[a.id, b.id, c.id], [d.id, e.id]]
    assert groups[0]["reasons"] == ["name", "phone"]
    assert groups[1]["reasons"] == ["email"]
    assert [x["deals"] for x in groups[0]["contacts"]] == [0, 1, 0]


def test_merge_moves_everything_and_fills_blanks(client, factory, staff):
    keep = factory.contact(staff, first_name="Noy", notes="Likes dark roast")
    other = factory.contact(
        staff,
        first_name="Noy",
        last_name="Keo",
        phone="020 5555",
        email="noy@example.la",
        notes="Pays cash",
    )
    deal = factory.deal(staff, contact=other, stage=Stage.proposal)
    task = factory.activity(staff, contact_id=other.id)
    headers = auth(staff)
    client.patch(f"/api/contacts/{keep.id}", headers=headers, json={"tags": ["vip"]})
    client.patch(f"/api/contacts/{other.id}", headers=headers, json={"tags": ["wholesale", "vip"]})
    client.post(
        "/api/attachments",
        headers=headers,
        data={"entity_type": "contact", "entity_id": str(other.id)},
        files={"file": ("card.jpg", b"jpeg", "image/jpeg")},
    )

    response = client.post(
        f"/api/contacts/{keep.id}/merge", headers=headers, json={"other_id": other.id}
    )

    body = response.json()
    assert response.status_code == 200, body
    assert body["last_name"] == "Keo"
    assert body["phone"] == "020 5555"
    assert body["email"] == "noy@example.la"
    assert body["notes"] == "Likes dark roast\n\nPays cash"
    assert body["tags"] == ["vip", "wholesale"]
    assert client.get(f"/api/contacts/{other.id}", headers=headers).status_code == 404
    assert client.get(f"/api/deals/{deal.id}", headers=headers).json()["contact"]["id"] == keep.id
    assert (
        client.get(f"/api/activities/{task.id}", headers=headers).json()["contact"]["id"] == keep.id
    )
    files = client.get(
        "/api/attachments",
        headers=headers,
        params={"entity_type": "contact", "entity_id": keep.id},
    ).json()
    assert [f["filename"] for f in files] == ["card.jpg"]

    merged = client.get(
        "/api/history", headers=headers, params={"entity_type": "contact", "entity_id": keep.id}
    ).json()["items"]
    entry = next(e for e in merged if e["action"] == "merged")
    assert entry["changes"][0] | {} == {
        "field": "merged_from",
        "from": other.id,
        "from_label": "Noy Keo",
        "deals": 1,
        "activities": 1,
        "files": 1,
    }


def test_merge_rules(client, factory, staff, other_staff):
    mine = factory.contact(staff)
    theirs = factory.contact(other_staff)
    url = f"/api/contacts/{mine.id}/merge"

    same = client.post(url, headers=auth(staff), json={"other_id": mine.id})
    hidden = client.post(url, headers=auth(staff), json={"other_id": theirs.id})

    assert same.json()["error"]["details"][0]["code"] == "same_contact"
    assert hidden.status_code == 422  # someone else's contact is "not found"
    assert (
        client.post(
            f"/api/contacts/{theirs.id}/merge", headers=auth(staff), json={"other_id": mine.id}
        ).status_code
        == 404
    )

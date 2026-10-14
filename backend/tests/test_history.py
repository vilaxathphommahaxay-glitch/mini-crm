from app.models import Stage
from tests.conftest import auth


def history(client, user, **params):
    response = client.get("/api/history", headers=auth(user), params=params)
    assert response.status_code == 200, response.json()
    return response.json()["items"]


def test_records_who_created_and_changed_a_contact(client, factory, staff):
    company = factory.company(staff, name="Dao Coffee")
    created = client.post(
        "/api/contacts",
        headers=auth(staff),
        json={"first_name": "Noy", "phone": "020 1111", "tags": ["vip"]},
    ).json()

    client.patch(
        f"/api/contacts/{created['id']}",
        headers=auth(staff),
        json={"phone": "020 2222", "company_id": company.id, "tags": ["wholesale"]},
    )

    events = history(client, staff, entity_type="contact", entity_id=created["id"])
    assert [e["action"] for e in events] == ["updated", "created"]  # newest first
    assert events[0]["actor"] == {"id": staff.id, "name": "Staff A"}
    assert events[0]["entity_label"] == "Noy"
    changes = {c["field"]: c for c in events[0]["changes"]}
    assert changes["phone"] == {"field": "phone", "from": "020 1111", "to": "020 2222"}
    assert changes["company_id"]["to_label"] == "Dao Coffee"
    assert changes["company_id"]["from_label"] is None
    assert changes["tags"] == {"field": "tags", "added": ["wholesale"], "removed": ["vip"]}


def test_saving_without_changes_records_nothing(client, factory, staff):
    contact = client.post("/api/contacts", headers=auth(staff), json={"first_name": "Noy"}).json()

    client.patch(f"/api/contacts/{contact['id']}", headers=auth(staff), json={"first_name": "Noy"})

    events = history(client, staff, entity_type="contact", entity_id=contact["id"])
    assert [e["action"] for e in events] == ["created"]


def test_stage_moves_are_recorded_but_reordering_is_not(client, factory, staff):
    deal = factory.deal(staff, stage=Stage.lead)
    other = factory.deal(staff, stage=Stage.lead)
    url = f"/api/deals/{deal.id}/move"

    client.patch(url, headers=auth(staff), json={"stage": "lead", "before_id": other.id})
    client.patch(url, headers=auth(staff), json={"stage": "qualified"})

    events = history(client, staff, entity_type="deal", entity_id=deal.id)
    assert len(events) == 1
    assert events[0]["changes"] == [{"field": "stage", "from": "lead", "to": "qualified"}]


def test_factory_rows_have_no_history(client, factory, staff):
    contact = factory.contact(staff)
    assert history(client, staff, entity_type="contact", entity_id=contact.id) == []


def test_admins_see_every_change_including_deletions(client, factory, staff, admin):
    activity = factory.activity(staff, subject="Call Noy")
    client.delete(f"/api/activities/{activity.id}", headers=auth(staff))

    feed = history(client, admin)
    assert feed[0]["action"] == "deleted"
    assert feed[0]["entity_type"] == "activity"
    assert feed[0]["entity_label"] == "Call Noy"
    assert feed[0]["actor"]["id"] == staff.id
    assert history(client, admin, entity_type="activity")[0]["entity_id"] == activity.id


def test_staff_only_see_history_of_their_own_records(client, factory, staff, other_staff):
    theirs = factory.contact(other_staff)

    assert client.get("/api/history", headers=auth(staff)).status_code == 403
    response = client.get(
        "/api/history",
        headers=auth(staff),
        params={"entity_type": "contact", "entity_id": theirs.id},
    )
    assert response.status_code == 404


def test_quote_edits_and_transfers_are_recorded(client, factory, staff, other_staff, admin):
    deal = factory.deal(staff)
    item = {"description": "Coffee", "quantity": "1", "unit_price": "100"}
    quote = client.post(
        f"/api/deals/{deal.id}/quotes", headers=auth(staff), json={"items": [item]}
    ).json()
    client.put(
        f"/api/quotes/{quote['id']}",
        headers=auth(staff),
        json={"items": [{**item, "quantity": "2"}], "issue_date": quote["issue_date"]},
    )
    events = history(client, staff, entity_type="quote", entity_id=quote["id"])
    assert [e["action"] for e in events] == ["updated", "created"]
    assert {"field": "items"} in events[0]["changes"]

    client.post(
        f"/api/users/{staff.id}/transfer", headers=auth(admin), json={"to_user_id": other_staff.id}
    )
    transfer = history(client, admin, entity_type="user", entity_id=staff.id)[0]
    assert transfer["action"] == "transferred"
    assert transfer["changes"][0]["to_label"] == "Staff B"
    assert transfer["changes"][1]["deals"] == 1

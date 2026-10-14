from sqlalchemy import func, select

from app.models import Activity, Company
from tests.conftest import auth


def create(client, user, **body):
    body.setdefault("first_name", "Noy")
    response = client.post("/api/contacts", headers=auth(user), json=body)
    assert response.status_code == 201, response.text
    return response.json()


def test_create_contact_with_company_and_tags(client, factory, staff):
    company = factory.company(staff, name="Mekong Trading")

    body = create(
        client,
        staff,
        first_name="Bounmy",
        last_name="Keomany",
        email="Bounmy@Example.LA",
        company_id=company.id,
        tags=["VIP", " vip ", "wholesale", ""],
    )

    assert body["full_name"] == "Bounmy Keomany"
    assert body["email"] == "bounmy@example.la"
    assert body["company"] == {"id": company.id, "name": "Mekong Trading"}
    assert body["tags"] == ["vip", "wholesale"]


def test_invalid_email_is_rejected(client, staff):
    response = client.post(
        "/api/contacts", headers=auth(staff), json={"first_name": "A", "email": "not-an-email"}
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "email"
    assert response.json()["error"]["details"][0]["code"] == "value_error"


def test_cannot_link_to_someone_elses_company(client, factory, staff, other_staff):
    theirs = factory.company(other_staff)

    response = client.post(
        "/api/contacts", headers=auth(staff), json={"first_name": "A", "company_id": theirs.id}
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "company_id"


def test_staff_cannot_see_other_staff_contacts(client, factory, staff, other_staff):
    theirs = factory.contact(other_staff)
    factory.contact(staff, first_name="Mine")

    listing = client.get("/api/contacts", headers=auth(staff)).json()

    assert [c["first_name"] for c in listing["items"]] == ["Mine"]
    assert client.get(f"/api/contacts/{theirs.id}", headers=auth(staff)).status_code == 404


def test_search_matches_every_word_across_fields(client, factory, staff):
    mekong = factory.company(staff, name="Mekong Trading")
    factory.contact(staff, first_name="Somchai", company_id=mekong.id)
    factory.contact(staff, first_name="Somchai", last_name="Other")
    factory.contact(staff, first_name="Noy", phone="+856 20 5555 1234")

    def search(q):
        items = client.get("/api/contacts", headers=auth(staff), params={"search": q}).json()
        return sorted(c["full_name"] for c in items["items"])

    assert search("somchai") == ["Somchai", "Somchai Other"]
    assert search("somchai mekong") == ["Somchai"]
    assert search("5555") == ["Noy"]
    assert search("nobody") == []


def test_filter_by_tag_and_company(client, factory, staff):
    company = factory.company(staff)
    create(client, staff, first_name="A", tags=["vip"], company_id=company.id)
    create(client, staff, first_name="B", tags=["retail"])

    by_tag = client.get("/api/contacts?tag=VIP", headers=auth(staff)).json()
    by_company = client.get(f"/api/contacts?company_id={company.id}", headers=auth(staff)).json()

    assert [c["first_name"] for c in by_tag["items"]] == ["A"]
    assert [c["first_name"] for c in by_company["items"]] == ["A"]


def test_pagination_and_newest_first(client, factory, staff):
    for i in range(25):
        create(client, staff, first_name=f"C{i:02d}")

    page1 = client.get("/api/contacts?size=10", headers=auth(staff)).json()
    page3 = client.get("/api/contacts?size=10&page=3", headers=auth(staff)).json()

    assert page1["total"] == 25
    assert page1["items"][0]["first_name"] == "C24"
    assert len(page3["items"]) == 5


def test_update_contact_tags_and_clear_company(client, factory, staff):
    company = factory.company(staff)
    contact = create(client, staff, company_id=company.id, tags=["a", "b"])

    response = client.patch(
        f"/api/contacts/{contact['id']}",
        headers=auth(staff),
        json={"tags": ["c"], "company_id": None, "last_name": "New"},
    )

    body = response.json()
    assert body["tags"] == ["c"]
    assert body["company"] is None
    assert body["last_name"] == "New"
    assert body["updated_at"] > contact["updated_at"]


def test_tags_endpoint_lists_only_visible_tags(client, staff, other_staff):
    create(client, staff, tags=["vip", "retail"])
    create(client, other_staff, tags=["secret"])

    assert client.get("/api/tags", headers=auth(staff)).json() == ["retail", "vip"]


def test_delete_contact_blocked_by_deal(client, factory, staff):
    contact = factory.contact(staff)
    factory.deal(staff, contact=contact)

    response = client.delete(f"/api/contacts/{contact.id}", headers=auth(staff))

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "has_related_records"


def test_delete_contact_removes_its_activities(client, db, factory, staff):
    contact = factory.contact(staff)
    factory.activity(staff, contact_id=contact.id)

    response = client.delete(f"/api/contacts/{contact.id}", headers=auth(staff))

    assert response.status_code == 204
    assert db.scalar(select(func.count()).select_from(Activity)) == 0


def test_admin_can_edit_record_of_deactivated_owner(client, db, factory, admin, staff):
    """Forms send the current owner back unchanged; that must not count as reassigning."""
    contact = factory.contact(staff)
    staff.is_active = False
    db.commit()

    response = client.patch(
        f"/api/contacts/{contact.id}",
        headers=auth(admin),
        json={"last_name": "Updated", "owner_id": staff.id},
    )

    assert response.status_code == 200, response.text
    assert response.json()["owner"]["id"] == staff.id


def test_assigning_to_a_deactivated_user_is_still_refused(
    client, db, factory, admin, staff, make_user
):
    contact = factory.contact(staff)
    inactive = make_user(is_active=False)

    response = client.patch(
        f"/api/contacts/{contact.id}", headers=auth(admin), json={"owner_id": inactive.id}
    )

    assert response.status_code == 422


def test_create_contact_with_a_new_company_name(client, db, staff):
    body = create(client, staff, first_name="Phonesavanh", company_name="Vang Vieng Resort")

    assert body["company"]["name"] == "Vang Vieng Resort"
    company = db.get(Company, body["company"]["id"])
    assert company.owner_id == staff.id


def test_company_name_reuses_an_existing_company(client, factory, staff, other_staff):
    mine = factory.company(staff, name="Champa Hotel")
    factory.company(other_staff, name="Secret Co")

    reused = create(client, staff, first_name="A", company_name="  champa HOTEL ")
    separate = create(client, staff, first_name="B", company_name="Secret Co")

    assert reused["company"]["id"] == mine.id
    assert separate["company"]["name"] == "Secret Co"  # can't see theirs -> gets its own


def test_company_name_on_update_and_conflict_with_company_id(client, factory, staff):
    contact = factory.contact(staff)
    other = factory.company(staff, name="Other")

    updated = client.patch(
        f"/api/contacts/{contact.id}", headers=auth(staff), json={"company_name": "New Shop"}
    )
    both = client.patch(
        f"/api/contacts/{contact.id}",
        headers=auth(staff),
        json={"company_name": "X", "company_id": other.id},
    )

    assert updated.json()["company"]["name"] == "New Shop"
    assert both.status_code == 422
    assert both.json()["error"]["details"][0]["field"] == "company_name"


def test_admin_assigning_a_contact_creates_the_company_for_that_owner(client, db, admin, staff):
    body = create(client, admin, first_name="A", company_name="Staff Shop", owner_id=staff.id)

    assert db.get(Company, body["company"]["id"]).owner_id == staff.id

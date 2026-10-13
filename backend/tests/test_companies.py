from tests.conftest import auth


def test_create_company_owned_by_creator(client, staff):
    response = client.post(
        "/api/companies",
        headers=auth(staff),
        json={"name": "  Mekong Trading ", "phone": "", "website": "https://mekong.la"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["name"] == "Mekong Trading"
    assert body["phone"] is None  # blank strings are stored as null
    assert body["owner"] == {"id": staff.id, "name": staff.name}


def test_too_long_optional_field_is_a_validation_error(client, staff):
    response = client.post(
        "/api/companies", headers=auth(staff), json={"name": "X", "phone": "1" * 51}
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "phone"


def test_staff_sees_only_own_companies(client, factory, staff, other_staff):
    factory.company(staff, name="Mine")
    theirs = factory.company(other_staff, name="Theirs")

    listing = client.get("/api/companies", headers=auth(staff)).json()
    assert [c["name"] for c in listing["items"]] == ["Mine"]

    # someone else's company behaves as if it doesn't exist
    headers = auth(staff)
    assert client.get(f"/api/companies/{theirs.id}", headers=headers).status_code == 404
    patch = client.patch(f"/api/companies/{theirs.id}", headers=headers, json={"name": "X"})
    assert patch.status_code == 404
    assert client.delete(f"/api/companies/{theirs.id}", headers=headers).status_code == 404


def test_admin_sees_all_and_can_filter_by_owner(client, factory, admin, staff, other_staff):
    factory.company(staff, name="A")
    factory.company(other_staff, name="B")

    everything = client.get("/api/companies", headers=auth(admin)).json()
    filtered = client.get(f"/api/companies?owner_id={staff.id}", headers=auth(admin)).json()

    assert everything["total"] == 2
    assert [c["name"] for c in filtered["items"]] == ["A"]


def test_staff_owner_filter_cannot_widen_scope(client, factory, staff, other_staff):
    factory.company(other_staff)

    response = client.get(f"/api/companies?owner_id={other_staff.id}", headers=auth(staff))

    assert response.json()["total"] == 0


def test_search_companies(client, factory, staff):
    factory.company(staff, name="Champa Hotel")
    factory.company(staff, name="Pakse Motors", phone="+856 31 222")

    by_name = client.get("/api/companies?search=champa", headers=auth(staff)).json()
    by_phone = client.get("/api/companies?search=31 222", headers=auth(staff)).json()

    assert [c["name"] for c in by_name["items"]] == ["Champa Hotel"]
    assert [c["name"] for c in by_phone["items"]] == ["Pakse Motors"]


def test_update_company_cannot_clear_name(client, factory, staff):
    company = factory.company(staff)

    response = client.patch(
        f"/api/companies/{company.id}", headers=auth(staff), json={"name": None}
    )

    assert response.status_code == 422


def test_staff_cannot_assign_company_to_someone_else(client, staff, other_staff):
    response = client.post(
        "/api/companies", headers=auth(staff), json={"name": "X", "owner_id": other_staff.id}
    )

    assert response.status_code == 403


def test_admin_assigns_owner_but_not_to_inactive_user(client, admin, staff, make_user):
    inactive = make_user(is_active=False)

    ok = client.post(
        "/api/companies", headers=auth(admin), json={"name": "X", "owner_id": staff.id}
    )
    bad = client.post(
        "/api/companies", headers=auth(admin), json={"name": "Y", "owner_id": inactive.id}
    )

    assert ok.json()["owner"]["id"] == staff.id
    assert bad.status_code == 422
    assert bad.json()["error"]["details"][0]["field"] == "owner_id"


def test_delete_company_blocked_while_contacts_exist(client, factory, staff):
    company = factory.company(staff)
    factory.contact(staff, company_id=company.id)

    response = client.delete(f"/api/companies/{company.id}", headers=auth(staff))

    assert response.status_code == 409
    assert "1 contact(s)" in response.json()["error"]["message"]


def test_delete_empty_company(client, factory, staff):
    company = factory.company(staff)

    response = client.delete(f"/api/companies/{company.id}", headers=auth(staff))

    assert response.status_code == 204
    assert client.get(f"/api/companies/{company.id}", headers=auth(staff)).status_code == 404

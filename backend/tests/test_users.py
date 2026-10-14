from tests.conftest import PASSWORD, auth


def test_staff_cannot_use_users_api(client, staff):
    response = client.get("/api/users", headers=auth(staff))

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "forbidden"


def test_admin_lists_users_with_pagination(client, admin, make_user):
    for _ in range(4):
        make_user()

    response = client.get("/api/users?page=2&size=2", headers=auth(admin))

    assert response.status_code == 200
    body = response.json()
    assert body["total"] == 5
    assert body["page"] == 2
    assert body["size"] == 2
    assert len(body["items"]) == 2


def test_page_size_is_capped(client, admin):
    response = client.get("/api/users?size=500", headers=auth(admin))

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "size"


def test_admin_creates_user_who_can_log_in(client, admin):
    response = client.post(
        "/api/users",
        headers=auth(admin),
        json={"name": "New Staff", "email": "New@Example.com", "password": PASSWORD},
    )

    assert response.status_code == 201
    assert response.json()["email"] == "new@example.com"
    assert response.json()["role"] == "staff"
    login = client.post("/api/auth/login", json={"email": "new@example.com", "password": PASSWORD})
    assert login.status_code == 200


def test_duplicate_email_is_rejected(client, admin, staff):
    response = client.post(
        "/api/users",
        headers=auth(admin),
        json={"name": "Copy", "email": staff.email, "password": PASSWORD},
    )

    assert response.status_code == 409
    assert response.json()["error"]["code"] == "email_taken"


def test_unknown_fields_are_rejected(client, admin):
    response = client.post(
        "/api/users",
        headers=auth(admin),
        json={"name": "X", "email": "x@example.com", "password": PASSWORD, "is_admin": True},
    )

    assert response.status_code == 422


def test_admin_updates_role_and_resets_password(client, admin, staff):
    response = client.patch(
        f"/api/users/{staff.id}",
        headers=auth(admin),
        json={"role": "admin", "password": "reset-pass-1"},
    )

    assert response.status_code == 200
    assert response.json()["role"] == "admin"
    login = client.post("/api/auth/login", json={"email": staff.email, "password": "reset-pass-1"})
    assert login.status_code == 200


def test_admin_cannot_lock_themselves_out(client, admin):
    deactivate = client.patch(
        f"/api/users/{admin.id}", headers=auth(admin), json={"is_active": False}
    )
    demote = client.patch(f"/api/users/{admin.id}", headers=auth(admin), json={"role": "staff"})

    assert deactivate.status_code == 409
    assert demote.status_code == 409


def test_update_missing_user(client, admin):
    response = client.patch("/api/users/9999", headers=auth(admin), json={"name": "X"})

    assert response.status_code == 404
    assert response.json()["error"]["message"] == "User not found"


def test_transfer_moves_everything_to_another_user(client, db, factory, admin, staff, other_staff):
    company = factory.company(staff)
    contact = factory.contact(staff, company_id=company.id)
    deal = factory.deal(staff, contact=contact)
    factory.activity(staff, contact_id=contact.id, deal_id=deal.id)
    factory.contact(other_staff)  # not touched

    response = client.post(
        f"/api/users/{staff.id}/transfer", headers=auth(admin), json={"to_user_id": other_staff.id}
    )

    assert response.status_code == 200, response.text
    assert response.json() == {"companies": 1, "contacts": 1, "deals": 1, "activities": 1}
    mine = client.get("/api/contacts", headers=auth(staff)).json()
    theirs = client.get("/api/contacts", headers=auth(other_staff)).json()
    assert mine["total"] == 0
    assert theirs["total"] == 2


def test_transfer_from_a_disabled_user_works(client, db, factory, admin, staff, other_staff):
    factory.contact(staff)
    staff.is_active = False
    db.commit()

    response = client.post(
        f"/api/users/{staff.id}/transfer", headers=auth(admin), json={"to_user_id": other_staff.id}
    )

    assert response.json()["contacts"] == 1


def test_transfer_rules(client, db, admin, staff, other_staff, make_user):
    disabled = make_user(is_active=False)

    def transfer(from_id, to_id, user=admin):
        return client.post(
            f"/api/users/{from_id}/transfer", headers=auth(user), json={"to_user_id": to_id}
        )

    assert transfer(staff.id, staff.id).status_code == 422  # to the same person
    assert transfer(staff.id, disabled.id).status_code == 422  # to a disabled user
    assert transfer(staff.id, 9999).status_code == 422
    assert transfer(9999, staff.id).status_code == 404
    assert transfer(staff.id, other_staff.id, user=staff).status_code == 403  # admins only

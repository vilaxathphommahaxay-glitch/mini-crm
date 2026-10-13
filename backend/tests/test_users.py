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

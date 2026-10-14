from datetime import timedelta

from app import clock
from app.security import create_access_token
from tests.conftest import PASSWORD, auth


def test_login_returns_token_and_user(client, staff):
    response = client.post("/api/auth/login", json={"email": staff.email, "password": PASSWORD})

    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["user"]["email"] == staff.email
    assert "password_hash" not in body["user"]

    me = client.get("/api/auth/me", headers={"Authorization": f"Bearer {body['access_token']}"})
    assert me.json()["id"] == staff.id


def test_login_email_is_case_insensitive(client, staff):
    response = client.post(
        "/api/auth/login", json={"email": staff.email.upper(), "password": PASSWORD}
    )
    assert response.status_code == 200


def test_login_wrong_password(client, staff):
    response = client.post("/api/auth/login", json={"email": staff.email, "password": "nope"})

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_login_unknown_email_gives_same_error(client):
    response = client.post(
        "/api/auth/login", json={"email": "ghost@example.com", "password": PASSWORD}
    )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "invalid_credentials"


def test_disabled_user_cannot_login(client, make_user):
    user = make_user(is_active=False)

    response = client.post("/api/auth/login", json={"email": user.email, "password": PASSWORD})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "account_disabled"


def test_token_of_disabled_user_stops_working(client, db, staff):
    headers = auth(staff)
    assert client.get("/api/auth/me", headers=headers).status_code == 200

    staff.is_active = False
    db.commit()

    assert client.get("/api/auth/me", headers=headers).status_code == 401


def test_missing_and_garbage_tokens(client):
    assert client.get("/api/auth/me").status_code == 401
    response = client.get("/api/auth/me", headers={"Authorization": "Bearer garbage"})
    assert response.status_code == 401
    assert response.json() == {
        "error": {"code": "unauthorized", "message": "Invalid or expired token", "details": []}
    }


def test_expired_token_is_rejected(client, staff):
    clock.freeze(clock.utcnow() - timedelta(days=1))
    old_token = create_access_token(staff.id)
    clock.freeze(None)

    response = client.get("/api/auth/me", headers={"Authorization": f"Bearer {old_token}"})
    assert response.status_code == 401


def test_change_password(client, staff):
    response = client.post(
        "/api/auth/change-password",
        headers=auth(staff),
        json={"current_password": PASSWORD, "new_password": "brand-new-pass"},
    )
    assert response.status_code == 204

    old = client.post("/api/auth/login", json={"email": staff.email, "password": PASSWORD})
    new = client.post("/api/auth/login", json={"email": staff.email, "password": "brand-new-pass"})
    assert old.status_code == 401
    assert new.status_code == 200


def test_change_password_requires_current_password(client, staff):
    response = client.post(
        "/api/auth/change-password",
        headers=auth(staff),
        json={"current_password": "wrong-one", "new_password": "brand-new-pass"},
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "current_password"
    assert response.json()["error"]["details"][0]["code"] == "wrong_password"


def test_password_limit_counts_bytes_not_characters(client, staff):
    lao_password = "ສ" * 30  # 30 characters, 90 bytes — over bcrypt's 72-byte limit

    response = client.post(
        "/api/auth/change-password",
        headers=auth(staff),
        json={"current_password": PASSWORD, "new_password": lao_password},
    )

    assert response.status_code == 422


def test_too_many_failed_logins_are_blocked_for_a_while(client, staff):
    def attempt(password):
        return client.post("/api/auth/login", json={"email": staff.email, "password": password})

    for _ in range(5):
        assert attempt("wrong").status_code == 401

    blocked = attempt(PASSWORD)  # even the right password is refused now
    assert blocked.status_code == 429
    assert blocked.json()["error"]["code"] == "too_many_attempts"
    assert "15 minute" in blocked.json()["error"]["message"]
    assert blocked.json()["error"]["details"] == [{"minutes": 15}]

    clock.freeze(clock.utcnow() + timedelta(minutes=16))
    assert attempt(PASSWORD).status_code == 200


def test_successful_login_clears_failures_and_other_emails_are_unaffected(client, staff, admin):
    def attempt(email, password):
        return client.post("/api/auth/login", json={"email": email, "password": password})

    for _ in range(4):
        attempt(staff.email, "wrong")
    assert attempt(staff.email, PASSWORD).status_code == 200
    for _ in range(4):
        assert attempt(staff.email, "wrong").status_code == 401  # counter started again

    for _ in range(5):
        attempt(staff.email, "wrong")
    assert attempt(admin.email, PASSWORD).status_code == 200


def test_guessing_across_many_emails_is_limited_per_client(client, staff):
    for i in range(20):
        client.post("/api/auth/login", json={"email": f"x{i}@example.com", "password": "nope"})

    response = client.post("/api/auth/login", json={"email": staff.email, "password": PASSWORD})

    assert response.status_code == 429

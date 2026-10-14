from datetime import UTC, date, datetime

from app import clock
from app.models import Currency, Stage
from tests.conftest import auth

ITEMS = [
    {"description": "Coffee beans 1 kg", "quantity": "3", "unit_price": "150000"},
    {"description": "Delivery", "quantity": "1", "unit_price": "25000.50"},
]


def test_create_quote_numbers_and_totals(client, factory, staff):
    company = factory.company(staff, name="Dao Coffee", address="Vientiane", phone="021 123")
    contact = factory.contact(staff, first_name="Noy", last_name="K", phone="020 5555 1234")
    contact.company_id = company.id
    deal = factory.deal(staff, contact=contact, company_id=company.id, currency=Currency.THB)
    headers = auth(staff)
    clock.freeze(datetime(2026, 3, 1, 3, 0, tzinfo=UTC))

    response = client.post(
        f"/api/deals/{deal.id}/quotes",
        headers=headers,
        json={"items": ITEMS, "discount": "5000.50", "tax_rate": "10"},
    )
    second = client.post(f"/api/deals/{deal.id}/quotes", headers=headers, json={"items": ITEMS})

    body = response.json()
    assert response.status_code == 201, body
    assert body["number"] == "Q-2026-0001"
    assert second.json()["number"] == "Q-2026-0002"
    assert body["currency"] == "THB"  # from the deal
    assert body["issue_date"] == "2026-03-01"
    assert body["valid_until"] == "2026-03-31"  # 30 days by default
    assert [i["amount"] for i in body["items"]] == ["450000.00", "25000.50"]
    assert body["subtotal"] == "475000.50"
    assert body["tax"] == "47000.00"  # 10% of (475000.50 - 5000.50)
    assert body["total"] == "517000.00"
    assert body["customer"] == {
        "name": "Noy K",
        "phone": "020 5555 1234",
        "email": None,
        "company_name": "Dao Coffee",
        "company_address": "Vientiane",
        "company_phone": "021 123",
    }
    assert body["prepared_by"]["id"] == staff.id

    listed = client.get(f"/api/deals/{deal.id}/quotes", headers=headers).json()
    assert [(q["number"], q["total"]) for q in listed] == [
        ("Q-2026-0002", "475000.50"),
        ("Q-2026-0001", "517000.00"),
    ]


def test_numbers_restart_each_year(client, factory, staff):
    deal = factory.deal(staff)
    headers = auth(staff)
    for issue in ["2025-12-30", "2026-01-02", "2026-01-03"]:
        client.post(
            f"/api/deals/{deal.id}/quotes",
            headers=headers,
            json={"items": ITEMS, "issue_date": issue},
        )
    numbers = [
        q["number"] for q in client.get(f"/api/deals/{deal.id}/quotes", headers=headers).json()
    ]
    assert sorted(numbers) == ["Q-2025-0001", "Q-2026-0001", "Q-2026-0002"]


def test_update_replaces_items(client, factory, staff):
    deal = factory.deal(staff)
    headers = auth(staff)
    quote = client.post(
        f"/api/deals/{deal.id}/quotes", headers=headers, json={"items": ITEMS}
    ).json()

    response = client.put(
        f"/api/quotes/{quote['id']}",
        headers=headers,
        json={
            "items": [{"description": "Only this", "quantity": "2.5", "unit_price": "10"}],
            "issue_date": quote["issue_date"],
            "valid_until": None,
            "notes": "Pay within 7 days",
        },
    )

    body = response.json()
    assert response.status_code == 200, body
    assert body["number"] == quote["number"]
    assert [i["description"] for i in body["items"]] == ["Only this"]
    assert body["total"] == "25.00"
    assert body["valid_until"] is None
    assert body["notes"] == "Pay within 7 days"


def test_quote_validation(client, factory, staff):
    deal = factory.deal(staff)
    url = f"/api/deals/{deal.id}/quotes"
    headers = auth(staff)

    def error_field(payload):
        response = client.post(url, headers=headers, json=payload)
        assert response.status_code == 422, response.json()
        return response.json()["error"]["details"][0]["field"]

    assert error_field({"items": []}) == "items"
    assert error_field({"items": [{**ITEMS[0], "quantity": "0"}]}) == "items.0.quantity"
    assert error_field({"items": [{**ITEMS[0], "description": " "}]}) == "items.0.description"
    assert error_field({"items": ITEMS, "tax_rate": "101"}) == "tax_rate"
    assert error_field({"items": ITEMS, "discount": "999999999"}) == "discount"
    assert (
        error_field({"items": ITEMS, "issue_date": "2026-03-10", "valid_until": "2026-03-09"})
        == "valid_until"
    )


def test_quotes_follow_deal_access(client, factory, staff, other_staff, admin):
    deal = factory.deal(staff)
    quote = client.post(
        f"/api/deals/{deal.id}/quotes", headers=auth(staff), json={"items": ITEMS}
    ).json()

    assert client.get(f"/api/quotes/{quote['id']}", headers=auth(other_staff)).status_code == 404
    assert client.get(f"/api/deals/{deal.id}/quotes", headers=auth(other_staff)).status_code == 404
    assert (
        client.post(
            f"/api/deals/{deal.id}/quotes", headers=auth(other_staff), json={"items": ITEMS}
        ).status_code
        == 404
    )
    assert client.delete(f"/api/quotes/{quote['id']}", headers=auth(other_staff)).status_code == 404
    assert client.get(f"/api/quotes/{quote['id']}", headers=auth(admin)).status_code == 200


def test_deleting_quote_or_deal(client, factory, staff):
    deal = factory.deal(staff, stage=Stage.proposal)
    headers = auth(staff)
    first = client.post(
        f"/api/deals/{deal.id}/quotes", headers=headers, json={"items": ITEMS}
    ).json()
    second = client.post(
        f"/api/deals/{deal.id}/quotes", headers=headers, json={"items": ITEMS}
    ).json()

    assert client.delete(f"/api/quotes/{first['id']}", headers=headers).status_code == 204
    assert client.get(f"/api/quotes/{first['id']}", headers=headers).status_code == 404

    assert client.delete(f"/api/deals/{deal.id}", headers=headers).status_code == 204
    assert client.get(f"/api/quotes/{second['id']}", headers=headers).status_code == 404


def test_business_profile(client, admin, staff):
    assert client.get("/api/settings/business", headers=auth(staff)).json()["name"] is None

    payload = {"name": "Dao Shop", "address": "Vientiane", "phone": "021 555", "tax_id": " "}
    forbidden = client.put("/api/settings/business", headers=auth(staff), json=payload)
    saved = client.put("/api/settings/business", headers=auth(admin), json=payload)

    assert forbidden.status_code == 403
    assert saved.json()["name"] == "Dao Shop"
    assert saved.json()["tax_id"] is None
    assert (
        client.get("/api/settings/business", headers=auth(staff)).json()["address"] == "Vientiane"
    )


def test_issue_date_defaults_to_local_today(client, factory, staff):
    deal = factory.deal(staff)
    headers = auth(staff)
    clock.freeze(datetime(2026, 3, 10, 18, 30, tzinfo=UTC))

    body = client.post(
        f"/api/deals/{deal.id}/quotes", headers=headers, json={"items": ITEMS}
    ).json()

    assert body["issue_date"] == str(date(2026, 3, 11))  # already the 11th in Vientiane


def test_valid_until_can_be_left_empty(client, factory, staff):
    deal = factory.deal(staff)
    body = client.post(
        f"/api/deals/{deal.id}/quotes",
        headers=auth(staff),
        json={"items": ITEMS, "valid_until": None},
    ).json()
    assert body["valid_until"] is None


def test_numbers_of_deleted_quotes_are_not_reused(client, factory, staff):
    deal = factory.deal(staff)
    headers = auth(staff)
    url = f"/api/deals/{deal.id}/quotes"
    client.post(url, headers=headers, json={"items": ITEMS})
    second = client.post(url, headers=headers, json={"items": ITEMS}).json()
    client.delete(f"/api/quotes/{second['id']}", headers=headers)

    third = client.post(url, headers=headers, json={"items": ITEMS}).json()

    assert second["number"].endswith("-0002")
    assert third["number"].endswith("-0003")  # 0002 may already be in a customer's hands

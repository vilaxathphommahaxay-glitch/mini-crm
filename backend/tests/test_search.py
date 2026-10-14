from tests.conftest import auth


def search(client, user, q, **params):
    response = client.get("/api/search", headers=auth(user), params={"q": q, **params})
    assert response.status_code == 200, response.text
    return response.json()


def test_finds_contacts_companies_and_deals(client, factory, staff):
    company = factory.company(staff, name="Mekong Trading", phone="+856 21 555")
    contact = factory.contact(
        staff, first_name="Bounmy", last_name="Keomany", company_id=company.id
    )
    factory.deal(staff, contact=contact, title="Mekong rice order")

    body = search(client, staff, "mekong")

    assert [c["full_name"] for c in body["contacts"]] == ["Bounmy Keomany"]  # via company name
    assert body["contacts"][0]["company"]["name"] == "Mekong Trading"
    assert [c["name"] for c in body["companies"]] == ["Mekong Trading"]
    assert body["deals"][0]["title"] == "Mekong rice order"
    assert body["deals"][0]["value"] == "1000.00"
    assert body["deals"][0]["contact"]["name"] == "Bounmy Keomany"


def test_deals_match_their_contact_name(client, factory, staff):
    contact = factory.contact(staff, first_name="Latsamy")
    factory.deal(staff, contact=contact, title="POS system")

    assert [d["title"] for d in search(client, staff, "latsamy")["deals"]] == ["POS system"]


def test_every_word_must_match(client, factory, staff):
    factory.company(staff, name="Champa Hotel")
    factory.company(staff, name="Champa Travel")

    names = [c["name"] for c in search(client, staff, "champa hotel")["companies"]]

    assert names == ["Champa Hotel"]


def test_only_searches_what_the_user_can_see(client, factory, staff, other_staff, admin):
    factory.company(other_staff, name="Secret Co")

    assert search(client, staff, "secret")["companies"] == []
    assert len(search(client, admin, "secret")["companies"]) == 1


def test_blank_query_and_limit(client, factory, staff):
    for i in range(8):
        factory.company(staff, name=f"Shop {i}")

    assert search(client, staff, "  ") == {"contacts": [], "companies": [], "deals": []}
    assert len(search(client, staff, "shop")["companies"]) == 5
    assert len(search(client, staff, "shop", limit=8)["companies"]) == 8

from datetime import UTC, datetime, timedelta
from decimal import Decimal

from sqlalchemy import select

from app import clock
from app.models import Activity, Deal, Stage
from tests.conftest import auth


def create(client, user, contact_id, **body):
    body = {"title": "Deal", "value": "1000", "contact_id": contact_id, **body}
    response = client.post("/api/deals", headers=auth(user), json=body)
    assert response.status_code == 201, response.text
    return response.json()


def move(client, user, deal_id, stage, before_id=None):
    return client.patch(
        f"/api/deals/{deal_id}/move",
        headers=auth(user),
        json={"stage": stage, "before_id": before_id},
    )


def column(db, stage):
    db.expire_all()
    stmt = select(Deal.title).where(Deal.stage == stage).order_by(Deal.position)
    return list(db.scalars(stmt))


def test_create_deal_defaults(client, factory, staff):
    company = factory.company(staff, name="Mekong")
    contact = factory.contact(staff, company_id=company.id)

    body = create(client, staff, contact.id, value=1500000)

    assert body["value"] == "1500000.00"
    assert body["currency"] == "LAK"
    assert body["stage"] == "lead"
    assert body["closed_at"] is None
    assert body["company"] == {"id": company.id, "name": "Mekong"}  # taken from the contact
    assert body["contact"]["name"] == "Noy"


def test_value_validation(client, factory, staff):
    contact = factory.contact(staff)

    for bad in ["-1", "1.234", "abc"]:
        response = client.post(
            "/api/deals",
            headers=auth(staff),
            json={"title": "X", "value": bad, "contact_id": contact.id},
        )
        assert response.status_code == 422, bad


def test_cannot_attach_deal_to_other_staff_contact(client, factory, staff, other_staff):
    theirs = factory.contact(other_staff)

    response = client.post(
        "/api/deals", headers=auth(staff), json={"title": "X", "value": 1, "contact_id": theirs.id}
    )

    assert response.status_code == 422
    assert response.json()["error"]["details"][0]["field"] == "contact_id"


def test_creating_in_won_stage_sets_closed_at(client, factory, staff):
    contact = factory.contact(staff)

    body = create(client, staff, contact.id, stage="won")

    assert body["closed_at"] is not None


def test_patch_cannot_change_stage(client, factory, staff):
    deal = factory.deal(staff)

    response = client.patch(f"/api/deals/{deal.id}", headers=auth(staff), json={"stage": "won"})

    assert response.status_code == 422


def test_new_deals_go_to_end_of_column(client, db, factory, staff):
    contact = factory.contact(staff)
    for title in ["A", "B", "C"]:
        create(client, staff, contact.id, title=title)

    assert column(db, Stage.lead) == ["A", "B", "C"]


def test_move_within_column(client, db, factory, staff):
    contact = factory.contact(staff)
    a, _, c = (create(client, staff, contact.id, title=t) for t in "ABC")

    assert move(client, staff, c["id"], "lead", before_id=a["id"]).status_code == 200
    assert column(db, Stage.lead) == ["C", "A", "B"]

    assert move(client, staff, c["id"], "lead").status_code == 200  # to the end
    assert column(db, Stage.lead) == ["A", "B", "C"]


def test_move_across_columns_renumbers_both(client, db, factory, staff):
    contact = factory.contact(staff)
    a = create(client, staff, contact.id, title="A")
    create(client, staff, contact.id, title="B")
    x = create(client, staff, contact.id, title="X", stage="qualified")

    response = move(client, staff, a["id"], "qualified", before_id=x["id"])

    assert response.json()["stage"] == "qualified"
    assert column(db, Stage.qualified) == ["A", "X"]
    assert column(db, Stage.lead) == ["B"]
    positions = db.scalars(select(Deal.position).order_by(Deal.stage, Deal.position)).all()
    assert sorted(positions) == [0, 0, 1]


def at_hours_ago(hours: int) -> None:
    # Travel back, not forward: tokens issued "in the future" are rejected by PyJWT.
    clock.freeze(datetime.now(UTC) - timedelta(hours=hours))


def test_closed_at_set_and_cleared(client, factory, staff):
    deal = factory.deal(staff)

    at_hours_ago(2)
    won = move(client, staff, deal.id, "won").json()
    assert won["closed_at"] is not None

    at_hours_ago(1)
    lost = move(client, staff, deal.id, "lost").json()
    assert lost["closed_at"] > won["closed_at"]  # won -> lost is a new close

    reopened = move(client, staff, deal.id, "proposal").json()
    assert reopened["closed_at"] is None


def test_reordering_inside_won_keeps_closed_at(client, factory, staff):
    deal = factory.deal(staff)
    at_hours_ago(3)
    first = move(client, staff, deal.id, "won").json()

    at_hours_ago(1)
    again = move(client, staff, deal.id, "won").json()

    assert again["closed_at"] == first["closed_at"]


def test_move_validates_before_id(client, factory, staff, other_staff):
    deal = factory.deal(staff)
    other_column = factory.deal(staff, stage=Stage.proposal)
    theirs = factory.deal(other_staff)

    assert move(client, staff, deal.id, "lead", before_id=deal.id).status_code == 422
    assert move(client, staff, deal.id, "lead", before_id=other_column.id).status_code == 422
    assert move(client, staff, deal.id, "lead", before_id=theirs.id).status_code == 422
    assert move(client, staff, theirs.id, "won").status_code == 404


def test_staff_move_keeps_relative_order_with_hidden_deals(client, db, factory, staff, other_staff):
    """Staff only see their own cards; dropping before one of them must still work."""
    mine1 = factory.deal(staff, title="mine1", position=0)
    factory.deal(other_staff, title="hidden", position=1)
    mine2 = factory.deal(staff, title="mine2", position=2)

    move(client, staff, mine2.id, "lead", before_id=mine1.id)

    assert column(db, Stage.lead) == ["mine2", "mine1", "hidden"]


def test_board_columns_totals_and_closed_window(client, factory, staff, other_staff):
    contact = factory.contact(staff)
    factory.deal(staff, contact=contact, value=Decimal("100"), position=0)
    factory.deal(staff, contact=contact, value=Decimal("50.50"), position=1)
    factory.deal(staff, contact=contact, value=Decimal("20"), currency="USD", position=2)
    factory.deal(other_staff, value=Decimal("999"))  # not visible to staff
    now = clock.utcnow()
    factory.deal(staff, contact=contact, stage=Stage.won, closed_at=now - timedelta(days=10))
    factory.deal(staff, contact=contact, stage=Stage.won, closed_at=now - timedelta(days=200))

    board = client.get("/api/deals/board", headers=auth(staff)).json()

    assert [c["stage"] for c in board] == [s.value for s in Stage]
    lead = board[0]
    assert lead["count"] == 3
    assert lead["totals"] == [
        {"currency": "LAK", "amount": "150.50"},
        {"currency": "USD", "amount": "20.00"},
    ]
    won = next(c for c in board if c["stage"] == "won")
    assert won["count"] == 1  # the 200-day-old win is off the board


def test_list_deals_filters(client, factory, staff):
    c1, c2 = factory.contact(staff), factory.contact(staff)
    factory.deal(staff, contact=c1, title="one")
    factory.deal(staff, contact=c2, title="two", stage=Stage.proposal)

    by_contact = client.get(f"/api/deals?contact_id={c1.id}", headers=auth(staff)).json()
    by_stage = client.get("/api/deals?stage=proposal", headers=auth(staff)).json()

    assert [d["title"] for d in by_contact["items"]] == ["one"]
    assert [d["title"] for d in by_stage["items"]] == ["two"]


def test_changing_contact_moves_company_along(client, factory, staff):
    company = factory.company(staff, name="New Co")
    new_contact = factory.contact(staff, company_id=company.id)
    deal = factory.deal(staff)

    response = client.patch(
        f"/api/deals/{deal.id}", headers=auth(staff), json={"contact_id": new_contact.id}
    )

    assert response.json()["company"]["name"] == "New Co"


def test_delete_deal_keeps_activities_unlinked(client, db, factory, staff):
    deal = factory.deal(staff)
    contact_id = deal.contact_id
    activity = factory.activity(staff, deal_id=deal.id, contact_id=contact_id)

    assert client.delete(f"/api/deals/{deal.id}", headers=auth(staff)).status_code == 204

    db.expire_all()
    kept = db.get(Activity, activity.id)
    assert kept is not None
    assert kept.deal_id is None
    assert kept.contact_id == contact_id

from datetime import UTC, date, datetime, timedelta
from decimal import Decimal

from app import clock
from app.models import Stage
from tests.conftest import auth

NOW = datetime(2026, 10, 14, 5, 0, tzinfo=UTC)  # 12:00 in Vientiane


def summary(client, headers, **params):
    response = client.get("/api/dashboard/summary", headers=headers, params=params)
    assert response.status_code == 200, response.text
    return response.json()


def test_pipeline_counts_and_totals_per_currency(client, factory, staff, other_staff):
    contact = factory.contact(staff)
    factory.deal(staff, contact=contact, value=Decimal("100"))
    factory.deal(staff, contact=contact, value=Decimal("200"))
    factory.deal(staff, contact=contact, value=Decimal("5"), currency="USD")
    factory.deal(staff, contact=contact, stage=Stage.won, closed_at=clock.utcnow())
    factory.deal(other_staff, value=Decimal("999"))

    body = summary(client, auth(staff))

    lead = body["pipeline"][0]
    assert lead == {
        "stage": "lead",
        "count": 3,
        "totals": [{"currency": "LAK", "amount": "300.00"}, {"currency": "USD", "amount": "5.00"}],
    }
    assert body["open_deals"] == 3  # the won deal is not open
    assert [p["stage"] for p in body["pipeline"]] == [s.value for s in Stage]


def test_won_by_month_uses_local_month_boundaries(client, factory, staff):
    headers = auth(staff)
    clock.freeze(NOW)
    contact = factory.contact(staff)
    # 30 Sep 20:00 UTC is already 1 Oct in Vientiane -> counts for October.
    factory.deal(
        staff,
        contact=contact,
        stage=Stage.won,
        value=Decimal("700"),
        closed_at=datetime(2026, 9, 30, 20, 0, tzinfo=UTC),
    )
    factory.deal(
        staff,
        contact=contact,
        stage=Stage.won,
        value=Decimal("50"),
        closed_at=datetime(2026, 9, 15, tzinfo=UTC),
    )
    # 13 months ago: outside the 12-month window
    factory.deal(
        staff,
        contact=contact,
        stage=Stage.won,
        value=Decimal("1"),
        closed_at=datetime(2025, 9, 15, tzinfo=UTC),
    )
    # lost deals never count as revenue
    factory.deal(staff, contact=contact, stage=Stage.lost, closed_at=NOW)

    months = summary(client, headers)["won_by_month"]

    assert len(months) == 12
    assert months[0]["month"] == "2025-11"
    assert months[-1] == {"month": "2026-10", "totals": [{"currency": "LAK", "amount": "700.00"}]}
    assert months[-2] == {"month": "2026-09", "totals": [{"currency": "LAK", "amount": "50.00"}]}
    assert all(m["totals"] == [] for m in months[:-2])


def test_task_counts_and_overdue_list(client, factory, staff):
    headers = auth(staff)
    clock.freeze(NOW)
    today = date(2026, 10, 14)
    for days in (-3, -1):
        factory.activity(staff, subject=f"late {-days}", due_date=today + timedelta(days))
    factory.activity(staff, subject="today", due_date=today)
    factory.activity(staff, subject="soon", due_date=today + timedelta(3))
    factory.activity(staff, subject="done late", due_date=today - timedelta(5), done=True)

    tasks = summary(client, headers)["tasks"]

    assert (tasks["overdue"], tasks["today"], tasks["upcoming"]) == (2, 1, 1)
    assert [a["subject"] for a in tasks["overdue_items"]] == ["late 3", "late 1"]


def test_admin_filters_dashboard_by_owner(client, factory, admin, staff, other_staff):
    factory.deal(staff)
    factory.deal(other_staff)

    everyone = summary(client, auth(admin))
    one = summary(client, auth(admin), owner_id=staff.id)

    assert everyone["open_deals"] == 2
    assert one["open_deals"] == 1

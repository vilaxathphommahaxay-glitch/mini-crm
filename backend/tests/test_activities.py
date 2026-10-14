from datetime import UTC, date, datetime, timedelta

from app import clock
from app.models import ActivityType
from tests.conftest import auth

# 18:30 UTC on 10 March is already 01:30 on 11 March in Vientiane (UTC+7).
LATE_EVENING_UTC = datetime(2026, 3, 10, 18, 30, tzinfo=UTC)
VIENTIANE_TODAY = date(2026, 3, 11)


def test_create_activity_for_deal_fills_in_contact(client, factory, staff):
    deal = factory.deal(staff)

    response = client.post(
        "/api/activities",
        headers=auth(staff),
        json={"type": "call", "subject": "Intro call", "deal_id": deal.id},
    )

    body = response.json()
    assert response.status_code == 201
    assert body["deal"] == {"id": deal.id, "title": "Deal"}
    assert body["contact"]["id"] == deal.contact_id


def test_cannot_link_activity_to_other_staff_records(client, factory, staff, other_staff):
    their_contact = factory.contact(other_staff)
    their_deal = factory.deal(other_staff)

    for field, value in [("contact_id", their_contact.id), ("deal_id", their_deal.id)]:
        response = client.post(
            "/api/activities",
            headers=auth(staff),
            json={"type": "note", "subject": "x", field: value},
        )
        assert response.status_code == 422
        assert response.json()["error"]["details"][0]["field"] == field


def test_marking_done_sets_and_clears_completed_at(client, factory, staff):
    task = factory.activity(staff, due_date=date.today())

    done = client.patch(f"/api/activities/{task.id}", headers=auth(staff), json={"done": True})
    undone = client.patch(f"/api/activities/{task.id}", headers=auth(staff), json={"done": False})

    assert done.json()["completed_at"] is not None
    assert undone.json()["completed_at"] is None


def test_due_filters_use_app_timezone(client, factory, staff):
    headers = auth(staff)  # issue the token before freezing time
    clock.freeze(LATE_EVENING_UTC)
    for offset, subject in [(-1, "overdue"), (0, "today"), (1, "tomorrow"), (7, "in a week")]:
        factory.activity(staff, subject=subject, due_date=VIENTIANE_TODAY + timedelta(offset))
    factory.activity(staff, subject="later", due_date=VIENTIANE_TODAY + timedelta(8))
    factory.activity(staff, subject="done", due_date=VIENTIANE_TODAY, done=True)
    factory.activity(staff, subject="no due date", type=ActivityType.note)

    def subjects(due):
        items = client.get(f"/api/activities?due={due}", headers=headers).json()["items"]
        return [a["subject"] for a in items]

    # In UTC it is still the 10th, so "today" would be wrong without the timezone.
    assert subjects("overdue") == ["overdue"]
    assert subjects("today") == ["today"]
    assert subjects("upcoming") == ["tomorrow", "in a week"]


def test_due_filter_can_include_done_items(client, factory, staff):
    factory.activity(staff, subject="done today", due_date=clock.local_today(), done=True)

    default = client.get("/api/activities?due=today", headers=auth(staff)).json()
    with_done = client.get("/api/activities?due=today&done=true", headers=auth(staff)).json()

    assert default["total"] == 0
    assert [a["subject"] for a in with_done["items"]] == ["done today"]


def test_timeline_for_contact_newest_first(client, factory, staff, other_staff):
    contact = factory.contact(staff)
    now = clock.utcnow()
    factory.activity(staff, subject="old", contact_id=contact.id, created_at=now - timedelta(2))
    factory.activity(staff, subject="new", contact_id=contact.id, created_at=now)
    factory.activity(staff, subject="other contact")

    items = client.get(f"/api/activities?contact_id={contact.id}", headers=auth(staff)).json()

    assert [a["subject"] for a in items["items"]] == ["new", "old"]


def test_staff_only_sees_own_activities(client, factory, staff, other_staff):
    theirs = factory.activity(other_staff)

    assert client.get("/api/activities", headers=auth(staff)).json()["total"] == 0
    assert client.get(f"/api/activities/{theirs.id}", headers=auth(staff)).status_code == 404


def test_delete_activity(client, factory, staff):
    activity = factory.activity(staff)

    assert client.delete(f"/api/activities/{activity.id}", headers=auth(staff)).status_code == 204
    assert client.get(f"/api/activities/{activity.id}", headers=auth(staff)).status_code == 404


def test_reminders_count_only_my_open_tasks(client, factory, admin, staff):
    headers, admin_headers = auth(staff), auth(admin)  # issue tokens before freezing time
    clock.freeze(LATE_EVENING_UTC)
    yesterday, today = VIENTIANE_TODAY - timedelta(1), VIENTIANE_TODAY
    factory.activity(staff, due_date=yesterday)
    factory.activity(staff, due_date=yesterday)
    factory.activity(staff, due_date=today)
    factory.activity(staff, due_date=today, done=True)
    factory.activity(staff, due_date=today + timedelta(1))
    factory.activity(admin, due_date=yesterday)

    mine = client.get("/api/activities/reminders", headers=headers)
    # the admin's badge is about the admin's own tasks, not the whole team's
    admins = client.get("/api/activities/reminders", headers=admin_headers)

    assert mine.json() == {"overdue": 2, "today": 1}
    assert admins.json() == {"overdue": 1, "today": 0}

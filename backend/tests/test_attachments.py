from app import storage
from tests.conftest import auth

PDF = b"%PDF-1.4 minimal"


def upload(client, user, entity_type, entity_id, name="contract.pdf", data=PDF):
    return client.post(
        "/api/attachments",
        headers=auth(user),
        data={"entity_type": entity_type, "entity_id": str(entity_id)},
        files={"file": (name, data, "application/octet-stream")},
    )


def test_upload_list_download_delete(client, factory, staff):
    contact = factory.contact(staff)

    response = upload(client, staff, "contact", contact.id, name="ສັນຍາ ລູກຄ້າ.pdf")
    body = response.json()
    assert response.status_code == 201, body
    assert body["filename"] == "ສັນຍາ ລູກຄ້າ.pdf"
    assert body["content_type"] == "application/pdf"  # from the name, not the browser
    assert body["size"] == len(PDF)
    assert body["uploaded_by"]["id"] == staff.id

    listed = client.get(
        "/api/attachments",
        headers=auth(staff),
        params={"entity_type": "contact", "entity_id": contact.id},
    ).json()
    assert [a["id"] for a in listed] == [body["id"]]

    file = client.get(f"/api/attachments/{body['id']}/file", headers=auth(staff))
    assert file.content == PDF
    assert file.headers["content-type"] == "application/pdf"
    assert file.headers["content-disposition"].startswith("inline;")
    assert "filename*=utf-8''" in file.headers["content-disposition"]  # Lao name survives

    assert client.delete(f"/api/attachments/{body['id']}", headers=auth(staff)).status_code == 204
    assert list(storage.root().iterdir()) == []


def test_only_safe_file_types(client, factory, staff):
    deal = factory.deal(staff)
    for name in ["run.exe", "page.html", "image.svg", "noextension", ""]:
        response = upload(client, staff, "deal", deal.id, name=name)
        assert response.status_code == 422, name
    docx = upload(client, staff, "deal", deal.id, name="offer.docx").json()
    file = client.get(f"/api/attachments/{docx['id']}/file", headers=auth(staff))
    assert file.headers["content-disposition"].startswith("attachment;")  # downloaded, not shown


def test_size_limits(client, factory, staff, monkeypatch):
    from app.config import get_settings

    monkeypatch.setattr(get_settings(), "max_upload_mb", 1)
    company = factory.company(staff)
    too_big = upload(client, staff, "company", company.id, name="big.png", data=b"x" * 1_000_001)
    empty = upload(client, staff, "company", company.id, name="empty.png", data=b"")

    assert too_big.status_code == 413
    assert too_big.json()["error"]["code"] == "attachment_too_large"
    assert empty.json()["error"]["code"] == "file_empty"
    assert list(storage.root().iterdir()) == []


def test_file_names_cannot_escape_the_folder(client, factory, staff):
    contact = factory.contact(staff)
    body = upload(client, staff, "contact", contact.id, name="../../etc/passwd.txt").json()
    assert body["filename"] == "passwd.txt"
    assert len(list(storage.root().iterdir())) == 1


def test_files_follow_record_access(client, factory, staff, other_staff, admin):
    contact = factory.contact(staff)
    attachment = upload(client, staff, "contact", contact.id).json()
    url = f"/api/attachments/{attachment['id']}"

    assert upload(client, other_staff, "contact", contact.id).status_code == 404
    assert client.get(f"{url}/file", headers=auth(other_staff)).status_code == 404
    assert client.delete(url, headers=auth(other_staff)).status_code == 404
    assert client.get(f"{url}/file", headers=auth(admin)).status_code == 200


def test_deleting_the_record_deletes_its_files(client, factory, staff):
    deal = factory.deal(staff)
    upload(client, staff, "deal", deal.id)
    upload(client, staff, "deal", deal.id, name="photo.jpg", data=b"\xff\xd8jpeg")

    assert client.delete(f"/api/deals/{deal.id}", headers=auth(staff)).status_code == 204
    assert list(storage.root().iterdir()) == []


def test_files_appear_in_the_record_history(client, factory, staff):
    contact = factory.contact(staff, first_name="Noy")
    attachment = upload(client, staff, "contact", contact.id, name="photo.jpg").json()
    client.delete(f"/api/attachments/{attachment['id']}", headers=auth(staff))

    events = client.get(
        "/api/history",
        headers=auth(staff),
        params={"entity_type": "contact", "entity_id": contact.id},
    ).json()["items"]
    assert [e["changes"] for e in events] == [
        [{"field": "files", "added": [], "removed": ["photo.jpg"]}],
        [{"field": "files", "added": ["photo.jpg"], "removed": []}],
    ]
    assert events[0]["entity_label"] == "Noy"

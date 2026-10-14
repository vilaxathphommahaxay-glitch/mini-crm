from enum import StrEnum
from pathlib import PurePath
from typing import Annotated

from fastapi import APIRouter, Form, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session, joinedload

from app import storage
from app.access import get_owned
from app.config import get_settings
from app.deps import CurrentUser, DbSession
from app.errors import AppError, not_found
from app.models import Attachment, Company, Contact, Deal, User
from app.schemas.attachments import AttachmentOut

router = APIRouter(prefix="/attachments", tags=["attachments"])


class EntityType(StrEnum):
    contact = "contact"
    company = "company"
    deal = "deal"


MODELS = {EntityType.contact: Contact, EntityType.company: Company, EntityType.deal: Deal}

# What people attach to customers: photos, PDFs, office documents. The type we store and serve
# comes from this list, never from the browser, and nothing here can run in a page.
ALLOWED = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".heic": "image/heic",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".ppt": "application/vnd.ms-powerpoint",
    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ".txt": "text/plain",
    ".csv": "text/csv",
    ".zip": "application/zip",
}
# shown in the browser; everything else is downloaded
INLINE = {"image/jpeg", "image/png", "image/webp", "image/gif", "application/pdf"}


def _check_record(db: Session, user: User, entity_type: EntityType, entity_id: int) -> None:
    get_owned(db, MODELS[entity_type], entity_id, user)


def _get_attachment(db: Session, user: User, attachment_id: int) -> Attachment:
    attachment = db.get(Attachment, attachment_id)
    if attachment is None:
        raise not_found("File")
    try:
        _check_record(db, user, EntityType(attachment.entity_type), attachment.entity_id)
    except AppError as exc:
        raise not_found("File") from exc
    return attachment


def remove_for(db: Session, entity_type: str, entity_id: int) -> list[str]:
    """When a record is deleted: drop its attachment rows. Returns the files to delete after
    the commit (so a failed delete doesn't lose them)."""
    keys = list(
        db.scalars(
            select(Attachment.storage_key).where(
                Attachment.entity_type == entity_type, Attachment.entity_id == entity_id
            )
        )
    )
    db.execute(
        delete(Attachment).where(
            Attachment.entity_type == entity_type, Attachment.entity_id == entity_id
        )
    )
    return keys


@router.get("", response_model=list[AttachmentOut])
def list_attachments(entity_type: EntityType, entity_id: int, user: CurrentUser, db: DbSession):
    _check_record(db, user, entity_type, entity_id)
    stmt = (
        select(Attachment)
        .options(joinedload(Attachment.uploaded_by))
        .where(Attachment.entity_type == entity_type, Attachment.entity_id == entity_id)
        .order_by(Attachment.created_at.desc(), Attachment.id.desc())
    )
    return db.scalars(stmt).all()


@router.post("", response_model=AttachmentOut, status_code=201)
async def upload(
    entity_type: Annotated[EntityType, Form()],
    entity_id: Annotated[int, Form()],
    file: UploadFile,
    user: CurrentUser,
    db: DbSession,
):
    _check_record(db, user, entity_type, entity_id)
    filename = PurePath((file.filename or "").replace("\\", "/")).name.strip()[:255]
    content_type = ALLOWED.get(PurePath(filename).suffix.lower())
    if not filename or content_type is None:
        raise AppError(
            422,
            "This kind of file can't be attached",
            code="file_type_not_allowed",
            details=[{"allowed": sorted(ALLOWED)}],
        )
    limit = get_settings().max_upload_mb * 1_000_000
    data = await file.read(limit + 1)
    if len(data) > limit:
        raise AppError(
            413,
            f"The file is larger than {get_settings().max_upload_mb} MB",
            code="attachment_too_large",
            details=[{"mb": get_settings().max_upload_mb}],
        )
    if not data:
        raise AppError(422, "The file is empty", code="file_empty")

    key = storage.save(data)
    attachment = Attachment(
        entity_type=entity_type,
        entity_id=entity_id,
        filename=filename,
        content_type=content_type,
        size=len(data),
        storage_key=key,
        uploaded_by_id=user.id,
    )
    db.add(attachment)
    try:
        db.commit()
    except Exception:
        storage.remove(key)
        raise
    return attachment


@router.get("/{attachment_id}/file")
def download(attachment_id: int, user: CurrentUser, db: DbSession):
    attachment = _get_attachment(db, user, attachment_id)
    path = storage.path_for(attachment.storage_key)
    if not path.exists():
        raise not_found("File")
    return FileResponse(
        path,
        media_type=attachment.content_type,
        filename=attachment.filename,
        content_disposition_type="inline" if attachment.content_type in INLINE else "attachment",
        headers={"Cache-Control": "private, max-age=3600"},
    )


@router.delete("/{attachment_id}", status_code=204)
def remove(attachment_id: int, user: CurrentUser, db: DbSession):
    attachment = _get_attachment(db, user, attachment_id)
    key = attachment.storage_key
    db.delete(attachment)
    db.commit()
    storage.remove(key)

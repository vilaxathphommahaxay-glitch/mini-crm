from fastapi import APIRouter
from sqlalchemy import select

from app.access import scope
from app.deps import CurrentUser, DbSession
from app.models import Contact, Tag, contact_tags

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[str])
def list_tags(user: CurrentUser, db: DbSession):
    """Tags in use on contacts the user can see — for the filter dropdown. Not paginated."""
    visible = scope(select(Contact.id), Contact, user)
    stmt = (
        select(Tag.name)
        .join(contact_tags, contact_tags.c.tag_id == Tag.id)
        .where(contact_tags.c.contact_id.in_(visible))
        .distinct()
        .order_by(Tag.name)
    )
    return db.scalars(stmt).all()

from typing import Annotated

from fastapi import Depends, Query
from pydantic import BaseModel
from sqlalchemy import Select, func, select
from sqlalchemy.orm import Session

MAX_PAGE_SIZE = 100


class PageParams:
    def __init__(
        self,
        page: Annotated[int, Query(ge=1)] = 1,
        size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE)] = 20,
    ):
        self.page = page
        self.size = size


Pagination = Annotated[PageParams, Depends()]


class Page[T](BaseModel):
    items: list[T]
    total: int
    page: int
    size: int


def paginate(db: Session, stmt: Select, params: PageParams) -> dict:
    total = db.scalar(select(func.count()).select_from(stmt.order_by(None).subquery()))
    items = db.scalars(stmt.limit(params.size).offset((params.page - 1) * params.size)).all()
    return {"items": items, "total": total or 0, "page": params.page, "size": params.size}

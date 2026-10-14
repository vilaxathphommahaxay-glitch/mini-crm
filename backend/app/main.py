from fastapi import APIRouter, FastAPI

from app.errors import register_error_handlers
from app.routers import activities, auth, companies, contacts, dashboard, deals, search, tags, users

app = FastAPI(title="Mini CRM", docs_url="/api/docs", openapi_url="/api/openapi.json")
register_error_handlers(app)

api = APIRouter(prefix="/api")


@api.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {"status": "ok"}


for module in (auth, users, companies, contacts, tags, deals, activities, dashboard, search):
    api.include_router(module.router)

app.include_router(api)

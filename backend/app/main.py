from fastapi import APIRouter, FastAPI

app = FastAPI(title="Mini CRM", docs_url="/api/docs", openapi_url="/api/openapi.json")

api = APIRouter(prefix="/api")


@api.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


app.include_router(api)

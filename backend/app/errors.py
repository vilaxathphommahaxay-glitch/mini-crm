"""One error shape for every response: {"error": {"code", "message", "details"}}."""

from typing import Any

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

STATUS_CODES = {
    400: "bad_request",
    401: "unauthorized",
    403: "forbidden",
    404: "not_found",
    405: "method_not_allowed",
    409: "conflict",
    413: "payload_too_large",
    422: "validation_error",
}


class AppError(Exception):
    def __init__(
        self,
        status_code: int,
        message: str,
        code: str | None = None,
        details: list[dict[str, Any]] | None = None,
    ):
        self.status_code = status_code
        self.message = message
        self.code = code or STATUS_CODES.get(status_code, "error")
        self.details = details or []


def not_found(what: str) -> AppError:
    return AppError(404, f"{what} not found")


def field_error(field: str, message: str) -> AppError:
    """422 pointing at one input field, same shape as FastAPI's own validation errors."""
    return AppError(422, message, details=[{"field": field, "message": message}])


def _response(status: int, code: str, message: str, details=None, headers=None) -> JSONResponse:
    body = {"error": {"code": code, "message": message, "details": details or []}}
    return JSONResponse(status_code=status, content=body, headers=headers)


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def _app_error(_: Request, exc: AppError):
        return _response(exc.status_code, exc.code, exc.message, exc.details)

    @app.exception_handler(StarletteHTTPException)
    async def _http_error(_: Request, exc: StarletteHTTPException):
        code = STATUS_CODES.get(exc.status_code, "error")
        message = exc.detail if isinstance(exc.detail, str) else code.replace("_", " ")
        return _response(exc.status_code, code, message, headers=getattr(exc, "headers", None))

    @app.exception_handler(RequestValidationError)
    async def _validation_error(_: Request, exc: RequestValidationError):
        details = [
            {
                # drop the "body"/"query" prefix: the client cares about the field name
                "field": ".".join(str(p) for p in err["loc"][1:]) or str(err["loc"][0]),
                "message": err["msg"],
            }
            for err in exc.errors()
        ]
        return _response(422, "validation_error", "Invalid input", details)

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


class AppError(Exception):
    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = 400,
        details: list | None = None,
    ):
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "error": {
                    "code": exc.code,
                    "message": exc.message,
                    "request_id": request_id,
                    "details": exc.details or [],
                }
            },
        )

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")
        details = []
        for e in exc.errors():
            field = ".".join(str(loc) for loc in e["loc"][1:]) or "request"
            msg = e.get("msg", "Invalid value")
            if msg.startswith("Value error, "):
                msg = msg[len("Value error, "):]
            details.append({"field": field, "message": msg})
        first_msg = details[0]["message"] if details else "Invalid request"
        return JSONResponse(
            status_code=422,
            content={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": first_msg,
                    "request_id": request_id,
                    "details": details,
                }
            },
        )

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        request_id = getattr(request.state, "request_id", "unknown")

        exc_name = type(exc).__name__
        if exc_name in ("TooManyConnectionsError", "InterfaceError", "ConnectionDoesNotExistError"):
            logger.warning("Database connection exhausted: %s", exc_name)
            return JSONResponse(
                status_code=503,
                content={
                    "error": {
                        "code": "SERVICE_BUSY",
                        "message": "The service is temporarily busy. Please try again in a moment.",
                        "request_id": request_id,
                        "details": [],
                    }
                },
            )

        logger.exception("Unhandled error: %s", exc_name)
        return JSONResponse(
            status_code=500,
            content={
                "error": {
                    "code": "INTERNAL_ERROR",
                    "message": "Something went wrong on our end. Please try again later.",
                    "request_id": request_id,
                    "details": [],
                }
            },
        )

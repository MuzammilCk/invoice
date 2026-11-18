"""Standardised JSON error responses (BP 8.2)."""

from __future__ import annotations

from fastapi import Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel


class ErrorResponse(BaseModel):
    """Standard error body: code, message, and optional field."""

    code: str
    message: str
    field: str | None = None


def error_json(status: int, code: str, message: str, field: str | None = None) -> JSONResponse:
    """Build a JSONResponse with the standard error format."""
    body = ErrorResponse(code=code, message=message, field=field)
    return JSONResponse(status_code=status, content=body.model_dump(exclude_none=True))


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Catch-all handler so unhandled errors still return the standard format."""
    return error_json(500, "INTERNAL_ERROR", "Something went wrong")

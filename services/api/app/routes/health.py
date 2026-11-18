"""Health check endpoint (BP 8.1)."""

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
def health() -> dict[str, str]:
    """Liveness probe."""
    return {"status": "ok"}

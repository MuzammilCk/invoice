"""FastAPI application factory."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.errors import generic_exception_handler


def create_app() -> FastAPI:
    app = FastAPI(title="Voice-to-Invoice API", version="0.1.0")

    # CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Error handlers
    app.add_exception_handler(Exception, generic_exception_handler)

    # Routers
    from app.auth.router import router as auth_router
    from app.routes.health import router as health_router

    app.include_router(health_router)
    app.include_router(auth_router)

    return app


app = create_app()

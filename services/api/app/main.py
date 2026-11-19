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
    from fastapi.exceptions import RequestValidationError

    from app.errors import validation_exception_handler

    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(Exception, generic_exception_handler)

    # Routers
    from app.auth.router import router as auth_router
    from app.routes.columns import router as columns_router
    from app.routes.designs import router as designs_router
    from app.routes.health import router as health_router
    from app.routes.presets import router as presets_router
    from app.routes.settings import router as settings_router
    from app.routes.setup import router as setup_router

    app.include_router(health_router)
    app.include_router(auth_router)
    app.include_router(columns_router)
    app.include_router(designs_router)
    app.include_router(presets_router)
    app.include_router(settings_router)
    app.include_router(setup_router)

    # Static / SPA serving if static_dir is provided
    import os

    from fastapi.responses import FileResponse
    from fastapi.staticfiles import StaticFiles

    static_dir = settings.static_dir or os.environ.get("VTI_STATIC_DIR")
    if static_dir and os.path.isdir(static_dir):
        assets_dir = os.path.join(static_dir, "assets")
        if os.path.isdir(assets_dir):
            app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            file_path = os.path.join(static_dir, full_path)
            if full_path and os.path.isfile(file_path):
                return FileResponse(file_path)
            index_path = os.path.join(static_dir, "index.html")
            if os.path.isfile(index_path):
                return FileResponse(index_path)
            return FileResponse(file_path)

    return app


app = create_app()

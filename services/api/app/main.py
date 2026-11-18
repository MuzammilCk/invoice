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

import asyncio
import logging
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app.api.routes import router
from app.config.settings import settings
from app.tasks.cleanup import cleanup_loop

logging.basicConfig(
    level=logging.DEBUG if settings.DEBUG else logging.INFO,
    format="%(asctime)s %(levelname)-8s %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[f"{settings.RATE_LIMIT_PER_MINUTE}/minute"],
)

_public = os.path.normpath(os.path.join(os.path.dirname(__file__), "..", "public"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(settings.DOWNLOAD_DIR, exist_ok=True)
    logger.info("Server ready — port %s | downloads → %s", settings.PORT, settings.DOWNLOAD_DIR)
    cleanup_task = asyncio.create_task(cleanup_loop(interval_secs=3600))
    yield
    cleanup_task.cancel()
    logger.info("Shutdown complete.")


app = FastAPI(
    title="Social Media Downloader",
    description="Download videos from YouTube, Instagram, TikTok, Twitter/X, Facebook, Reddit, Vimeo & Dailymotion.",
    version="2.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

from fastapi.openapi.utils import get_openapi

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema
    openapi_schema = get_openapi(
        title=app.title,
        version=app.version,
        description=app.description,
        routes=app.routes,
    )
    openapi_schema["servers"] = [{"url": "/"}]
    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


if os.path.isdir(_public):
    for _sub in ("css", "js", "img"):
        _dir = os.path.join(_public, _sub)
        if os.path.isdir(_dir):
            app.mount(f"/{_sub}", StaticFiles(directory=_dir), name=_sub)

    @app.get("/", include_in_schema=False)
    async def index():
        return FileResponse(os.path.join(_public, "index.html"))

    @app.get("/404.html", include_in_schema=False)
    async def not_found_page():
        return FileResponse(os.path.join(_public, "404.html"))

import logging
import os
import time
from collections import defaultdict, deque

import httpcore
import httpx
from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from starlette.middleware.cors import CORSMiddleware

from api.routes import admin, auth, contacts, dashboard, invites, maintenance, professions, properties, receipts, team, users
from core.database import supabase as db

DEFAULT_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:4173",
    "http://localhost:5173",
    "http://localhost:8000",
    "http://localhost:19000",
    "http://localhost:19001",
    "http://127.0.0.1:19000",
    "http://127.0.0.1:19001",
    "http://localhost:8083",
    "http://127.0.0.1:8083",
    "http://192.168.1.113:8083",
]
AUTH_RESOLVE_RATE_LIMIT_WINDOW_SECONDS = int(os.environ.get("AUTH_RESOLVE_RATE_LIMIT_WINDOW_SECONDS", "60"))
AUTH_RESOLVE_RATE_LIMIT_MAX_REQUESTS = int(os.environ.get("AUTH_RESOLVE_RATE_LIMIT_MAX_REQUESTS", "20"))
_rate_limit_buckets: dict[str, deque[float]] = defaultdict(deque)


def _parse_allowed_origins() -> list[str]:
    raw = os.environ.get("ALLOWED_ORIGINS", "").strip()
    if not raw:
        return DEFAULT_ALLOWED_ORIGINS
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


def _get_request_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


app = FastAPI()

app.include_router(auth.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(properties.router, prefix="/api")
app.include_router(receipts.router, prefix="/api")
app.include_router(maintenance.router, prefix="/api")
app.include_router(dashboard.router, prefix="/api")
app.include_router(team.router, prefix="/api")
app.include_router(admin.router, prefix="/api")
app.include_router(invites.router, prefix="/api")
app.include_router(contacts.router, prefix="/api")
app.include_router(professions.router, prefix="/api")

allowed_origins = _parse_allowed_origins()

app.add_middleware(
    CORSMiddleware,
    allow_credentials="*" not in allowed_origins,
    allow_origins=allowed_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)


@app.get("/health")
def health_check():
    return {"status": "ok"}


@app.get("/api/health")
def api_health_check():
    return {"status": "ok"}


@app.middleware("http")
async def auth_resolve_rate_limit(request: Request, call_next):
    if (
        request.method == "POST"
        and request.url.path == "/api/auth/resolve-identifier"
        and AUTH_RESOLVE_RATE_LIMIT_MAX_REQUESTS > 0
    ):
        bucket_key = f"{_get_request_ip(request)}:{request.url.path}"
        now = time.monotonic()
        bucket = _rate_limit_buckets[bucket_key]

        while bucket and now - bucket[0] >= AUTH_RESOLVE_RATE_LIMIT_WINDOW_SECONDS:
            bucket.popleft()

        if len(bucket) >= AUTH_RESOLVE_RATE_LIMIT_MAX_REQUESTS:
            return JSONResponse(
                {
                    "detail": (
                        f"Cok fazla deneme yapildi. "
                        f"Lutfen {AUTH_RESOLVE_RATE_LIMIT_WINDOW_SECONDS} saniye sonra tekrar deneyin."
                    )
                },
                status_code=429,
            )

        bucket.append(now)

    return await call_next(request)


@app.exception_handler(httpx.RemoteProtocolError)
@app.exception_handler(httpcore.RemoteProtocolError)
async def supabase_disconnect_handler(_request: Request, exc: Exception):
    logger.warning("Supabase baglantisi kesildi, client yenileniyor: %s", exc)
    db._refresh()
    return JSONResponse(
        {"detail": "Baglanti yenilendi, lutfen tekrar deneyin"},
        status_code=503,
    )


@app.exception_handler(Exception)
async def generic_exception_handler(request: Request, exc: Exception):
    logger.error(
        "Unhandled exception on %s %s: %s",
        request.method, request.url.path, exc,
        exc_info=True,
    )
    return JSONResponse(
        {"detail": f"Sunucu hatasi ({type(exc).__name__}). Lutfen tekrar deneyin."},
        status_code=500,
    )

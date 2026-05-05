import logging

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from supabase import Client, create_client

from .database import SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, supabase

logger = logging.getLogger(__name__)


def _create_auth_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)


# Service role client for token verification.
_auth_client: Client = _create_auth_client()

security = HTTPBearer()


def _refresh_auth_client() -> None:
    global _auth_client
    _auth_client = _create_auth_client()


def _is_transient_auth_error(exc: Exception) -> bool:
    if isinstance(exc, OSError):
        return True

    error_name = type(exc).__name__
    if error_name in {
        "ConnectError",
        "NetworkError",
        "PoolTimeout",
        "ReadError",
        "ReadTimeout",
        "RemoteProtocolError",
        "TimeoutException",
        "WriteError",
        "WriteTimeout",
    }:
        return True

    detail = str(exc).lower()
    return any(
        fragment in detail
        for fragment in [
            "connection aborted",
            "connection reset",
            "temporarily unavailable",
            "winerror 10035",
        ]
    )


def _get_auth_user(token: str):
    last_error: Exception | None = None

    for attempt in range(2):
        try:
            return _auth_client.auth.get_user(token)
        except Exception as exc:
            if not _is_transient_auth_error(exc):
                raise

            last_error = exc
            logger.warning(
                "Supabase auth get_user temporarily failed (attempt %s/2): %s",
                attempt + 1,
                exc,
            )
            _refresh_auth_client()

    if last_error is not None:
        raise last_error

    raise RuntimeError("Supabase auth get_user returned no result")


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        auth_response = _get_auth_user(token)
        if not auth_response or not auth_response.user:
            raise HTTPException(status_code=401, detail="Gecersiz token")

        auth_user = auth_response.user
        result = supabase.table("users").select("*").eq("auth_id", str(auth_user.id)).single().execute()
        if not result.data:
            raise HTTPException(status_code=401, detail="Kullanici profili bulunamadi")

        return result.data
    except HTTPException:
        raise
    except Exception as exc:
        if _is_transient_auth_error(exc):
            logger.warning("Supabase auth/profile transport issue, refreshing clients: %s", exc)
            _refresh_auth_client()
            try:
                supabase._refresh()
            except Exception:
                pass
            raise HTTPException(status_code=503, detail="Kimlik dogrulama servisine ulasilamadi")

        raise HTTPException(status_code=401, detail=f"Token error: {type(exc).__name__}: {str(exc)}")

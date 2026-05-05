import os
from pathlib import Path

from dotenv import load_dotenv
from supabase import Client, create_client

ROOT_DIR = Path(__file__).parent.parent
load_dotenv(ROOT_DIR / ".env")


def _require_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required backend environment variable: {name}")
    return value


SUPABASE_URL = _require_env("SUPABASE_URL").rstrip("/")
SUPABASE_SERVICE_ROLE_KEY = _require_env("SUPABASE_SERVICE_ROLE_KEY")


class _SupabaseProxy:
    """Supabase client proxy; baglanti koptugunda refresh edilebilir."""

    def __init__(self):
        self._refresh()

    def _refresh(self):
        self._client: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    def __getattr__(self, name: str):
        return getattr(self._client, name)


# Service role client; backend is mantigi icin (RLS bypass eder)
supabase = _SupabaseProxy()

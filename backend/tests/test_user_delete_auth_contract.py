import os
import sys
import types
import unittest
from pathlib import Path
from unittest.mock import MagicMock

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role-key")

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

dotenv_module = types.ModuleType("dotenv")
dotenv_module.load_dotenv = lambda *args, **kwargs: None
supabase_module = types.ModuleType("supabase")
supabase_module.Client = object
supabase_module.create_client = lambda *args, **kwargs: object()
fastapi_module = types.ModuleType("fastapi")


class FakeRouter:
    def __init__(self, *args, **kwargs):
        pass

    def get(self, *args, **kwargs):
        return lambda fn: fn

    def post(self, *args, **kwargs):
        return lambda fn: fn

    def patch(self, *args, **kwargs):
        return lambda fn: fn

    def delete(self, *args, **kwargs):
        return lambda fn: fn


class FakeHTTPException(Exception):
    def __init__(self, status_code=None, detail=None):
        super().__init__(detail)
        self.status_code = status_code
        self.detail = detail


fastapi_module.APIRouter = FakeRouter
fastapi_module.HTTPException = FakeHTTPException
fastapi_module.Depends = lambda dependency=None: dependency
fastapi_security_module = types.ModuleType("fastapi.security")
fastapi_security_module.HTTPAuthorizationCredentials = type(
    "HTTPAuthorizationCredentials",
    (),
    {"credentials": ""},
)
fastapi_security_module.HTTPBearer = lambda *args, **kwargs: None
pydantic_module = types.ModuleType("pydantic")
pydantic_module.BaseModel = type("BaseModel", (), {})
sys.modules.setdefault("dotenv", dotenv_module)
sys.modules.setdefault("supabase", supabase_module)
sys.modules.setdefault("fastapi", fastapi_module)
sys.modules.setdefault("fastapi.security", fastapi_security_module)
sys.modules.setdefault("pydantic", pydantic_module)

from api.routes import users


class UserDeleteAuthContractTest(unittest.TestCase):
    def test_delete_auth_user_if_present_deletes_supabase_auth_user(self):
        users.supabase = MagicMock()

        users._delete_auth_user_if_present("auth-123")

        users.supabase.auth.admin.delete_user.assert_called_once_with("auth-123")

    def test_delete_auth_user_if_present_skips_missing_auth_id(self):
        users.supabase = MagicMock()

        users._delete_auth_user_if_present(None)

        users.supabase.auth.admin.delete_user.assert_not_called()


if __name__ == "__main__":
    unittest.main()

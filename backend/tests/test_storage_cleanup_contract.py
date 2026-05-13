import os
import types
import unittest
from pathlib import Path

os.environ.setdefault("SUPABASE_URL", "https://example.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "fake-service-role-key")

import sys

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

    def put(self, *args, **kwargs):
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

from core.storage import extract_storage_path
from api.routes.properties import _build_property_storage_cleanup


class StorageCleanupContractTest(unittest.TestCase):
    def test_extract_storage_path_accepts_supabase_object_urls(self):
        self.assertEqual(
            extract_storage_path(
                "property-images",
                "https://example.supabase.co/storage/v1/object/public/property-images/prop/photo.jpg?t=1",
            ),
            "prop/photo.jpg",
        )
        self.assertEqual(
            extract_storage_path("receipts", "receipts/property/user/file.pdf"),
            "property/user/file.pdf",
        )

    def test_extract_storage_path_rejects_external_and_local_values(self):
        self.assertIsNone(extract_storage_path("receipts", "https://cdn.example.com/file.pdf"))
        self.assertIsNone(extract_storage_path("receipts", "file:///tmp/file.pdf"))
        self.assertIsNone(extract_storage_path("receipts", "content://local/file.pdf"))

    def test_property_delete_collects_related_storage_paths_by_bucket(self):
        cleanup = _build_property_storage_cleanup(
            property_doc={
                "images": [
                    "https://example.supabase.co/storage/v1/object/public/property-images/p1/a.jpg",
                    "external-image",
                ],
            },
            receipts=[
                {"storage_path": "p1/u1/rent.pdf"},
                {"document_url": "https://example.supabase.co/storage/v1/object/sign/receipts/p1/u1/dues.jpg?token=x"},
            ],
            maintenance_requests=[
                {"photo_urls": ["p1/u2/m1.jpg", "https://cdn.example.com/m2.jpg"]},
            ],
            property_documents=[
                {"storage_path": "p1/contract.pdf"},
                {"file_url": "property-documents/p1/deed.pdf"},
            ],
        )

        self.assertEqual(cleanup["property-images"], ["p1/a.jpg"])
        self.assertEqual(cleanup["receipts"], ["p1/u1/rent.pdf", "p1/u1/dues.jpg"])
        self.assertEqual(cleanup["maintenance-photos"], ["p1/u2/m1.jpg"])
        self.assertEqual(cleanup["property-documents"], ["p1/contract.pdf", "p1/deed.pdf"])


if __name__ == "__main__":
    unittest.main()

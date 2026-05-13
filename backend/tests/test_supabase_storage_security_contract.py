import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


class SupabaseStorageSecurityContractTest(unittest.TestCase):
    def test_sensitive_storage_buckets_are_private(self):
        buckets_sql = read("supabase/schema_parts/09_storage_buckets.sql")

        for bucket in [
            "receipts",
            "property-documents",
            "maintenance-photos",
            "team-message-files",
            "tenant-documents",
            "task-photos",
            "announcement-files",
        ]:
            self.assertIn(f"VALUES ('{bucket}', '{bucket}', FALSE", buckets_sql)

    def test_private_storage_read_policies_are_not_bucket_wide(self):
        policies_sql = read("supabase/schema_parts/10_storage_policies.sql")

        self.assertNotIn("USING (bucket_id = 'receipts');", policies_sql)
        self.assertNotIn("USING (bucket_id = 'property-documents');", policies_sql)
        self.assertNotIn("USING (bucket_id = 'maintenance-photos');", policies_sql)
        self.assertNotIn("bucket_id IN ('task-photos', 'announcement-files')", policies_sql)

        self.assertIn("public.current_user_can_view_property", policies_sql)
        self.assertIn("public.current_user_can_manage_property", policies_sql)
        self.assertIn("public.team_tasks", policies_sql)
        self.assertIn("public.announcements", policies_sql)

    def test_storage_tightening_migration_exists(self):
        migration_sql = read("supabase/migrations/20260513_storage_policy_tightening.sql")

        self.assertIn("VALUES ('tenant-documents', 'tenant-documents', FALSE", migration_sql)
        self.assertIn("VALUES ('task-photos', 'task-photos', FALSE", migration_sql)
        self.assertIn("VALUES ('announcement-files', 'announcement-files', FALSE", migration_sql)
        self.assertIn("public.current_user_can_view_property", migration_sql)
        self.assertIn("public.current_user_can_manage_property", migration_sql)


if __name__ == "__main__":
    unittest.main()

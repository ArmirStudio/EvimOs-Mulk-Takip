import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]


class AdAnalyticsContractTest(unittest.TestCase):
    def read(self, relative_path: str) -> str:
        return (ROOT / relative_path).read_text(encoding="utf-8")

    def test_schema_defines_ad_interactions_table(self):
        schema = self.read("supabase/schema_parts/01_core_tables.sql")
        indexes = self.read("supabase/schema_parts/03_performance_indexes.sql")
        rls = self.read("supabase/schema_parts/06_enable_rls.sql")
        policies = self.read("supabase/schema_parts/07_rls_policies.sql")
        grants = self.read("supabase/schema_parts/08_grants.sql")

        self.assertIn("CREATE TABLE IF NOT EXISTS public.ad_interactions", schema)
        self.assertIn("event_type", schema)
        self.assertIn("'click'", schema)
        self.assertIn("'link_open'", schema)
        self.assertIn("idx_ad_interactions_ad_created", indexes)
        self.assertIn("ALTER TABLE public.ad_interactions", rls)
        self.assertIn("ad_interactions_admin_read", policies)
        self.assertIn("GRANT ALL ON public.ad_interactions TO service_role", grants)

    def test_migration_exists_for_live_database(self):
        migration = self.read("supabase/migrations/20260513_ad_interactions.sql")
        self.assertIn("CREATE TABLE IF NOT EXISTS public.ad_interactions", migration)
        self.assertIn("ENABLE ROW LEVEL SECURITY", migration)
        self.assertIn("ad_interactions_admin_read", migration)

    def test_backend_exposes_record_and_stats_endpoints(self):
        dashboard = self.read("backend/api/routes/dashboard.py")
        admin = self.read("backend/api/routes/admin.py")
        schemas = self.read("backend/models/schemas.py")

        self.assertIn("CampaignEventRequest", schemas)
        self.assertIn("@router.post(\"/campaigns/{campaign_id}/events\")", dashboard)
        self.assertIn("supabase.table(\"ad_interactions\").insert", dashboard)
        self.assertIn("@router.get(\"/campaigns/stats\")", admin)
        self.assertIn("ad_interactions", admin)

    def test_clients_use_backend_for_ad_events(self):
        app_api = self.read("frontend/services/appApi.ts")
        marketing = self.read("frontend/components/Shared/DashboardMarketingSection.tsx")
        interstitial = self.read("frontend/components/Shared/InterstitialAdModal.tsx")
        admin_api = self.read("admin-web/src/lib/api.ts")
        campaign_list = self.read("admin-web/src/pages/CampaignList.tsx")

        self.assertIn("recordCampaignEvent", app_api)
        self.assertIn("/dashboard/campaigns/${campaignId}/events", app_api)
        self.assertIn("onCampaignEvent", marketing)
        self.assertIn("onCampaignEvent", interstitial)
        self.assertIn("listAdminCampaignStats", admin_api)
        self.assertIn("statsByCampaign", campaign_list)


if __name__ == "__main__":
    unittest.main()

-- ============================================================
-- Run order: 07d — RLS policies: Advertising
-- Tablolar: ad_campaigns, ad_impressions, ad_interactions
-- ============================================================

-- ── AD_CAMPAIGNS ────────────────────────────────────────────
DROP POLICY IF EXISTS "ads_read_active" ON public.ad_campaigns;
DROP POLICY IF EXISTS "ads_admin_all"   ON public.ad_campaigns;

CREATE POLICY "ads_read_active" ON public.ad_campaigns
  FOR SELECT USING (
    active = TRUE
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

CREATE POLICY "ads_admin_all" ON public.ad_campaigns
  FOR ALL USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');


-- ── AD_IMPRESSIONS ──────────────────────────────────────────
DROP POLICY IF EXISTS "impressions_self_read"   ON public.ad_impressions;
DROP POLICY IF EXISTS "impressions_self_insert" ON public.ad_impressions;
DROP POLICY IF EXISTS "impressions_self_update" ON public.ad_impressions;

CREATE POLICY "impressions_self_read" ON public.ad_impressions
  FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "impressions_self_insert" ON public.ad_impressions
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "impressions_self_update" ON public.ad_impressions
  FOR UPDATE USING (user_id = public.get_current_user_id());


-- ── AD_INTERACTIONS ─────────────────────────────────────────
DROP POLICY IF EXISTS "ad_interactions_admin_read"   ON public.ad_interactions;
DROP POLICY IF EXISTS "ad_interactions_self_insert"  ON public.ad_interactions;

CREATE POLICY "ad_interactions_admin_read" ON public.ad_interactions
  FOR SELECT USING (public.get_current_user_role() = 'admin');

CREATE POLICY "ad_interactions_self_insert" ON public.ad_interactions
  FOR INSERT WITH CHECK (
    user_id = public.get_current_user_id()
    OR user_id IS NULL
  );

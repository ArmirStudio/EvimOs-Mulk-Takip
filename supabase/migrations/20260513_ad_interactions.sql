CREATE TABLE IF NOT EXISTS public.ad_interactions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id       UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  event_type  TEXT NOT NULL CHECK (event_type IN ('click', 'link_open')),
  placement   TEXT,
  link_url    TEXT,
  shown_date  DATE NOT NULL DEFAULT CURRENT_DATE,
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_interactions_ad_created
  ON public.ad_interactions(ad_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_user_created
  ON public.ad_interactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_interactions_type_date
  ON public.ad_interactions(event_type, shown_date);

ALTER TABLE public.ad_interactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ad_interactions_admin_read" ON public.ad_interactions;
CREATE POLICY "ad_interactions_admin_read" ON public.ad_interactions
  FOR SELECT USING (public.get_current_user_role() = 'admin');

GRANT ALL ON public.ad_interactions TO service_role;

-- ============================================================
-- Run order: 01d — Advertising tables
-- Tablolar: ad_campaigns, ad_impressions, ad_interactions
-- ============================================================

-- ── ad_campaigns ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL
                     CHECK (type IN ('inline_ad', 'news', 'testimonial', 'service', 'interstitial')),
  title            TEXT,
  body             TEXT,
  image_url        TEXT,
  link_url         TEXT,
  sort_order       INTEGER  DEFAULT 0,
  -- Testimonial
  client_name      TEXT,
  client_avatar    TEXT,
  client_rating    NUMERIC(2,1)
                     CHECK (client_rating IS NULL OR (client_rating >= 1.0 AND client_rating <= 5.0)),
  client_title     TEXT,
  client_company   TEXT,
  -- Service
  service_icon     TEXT,
  -- Interstitial
  daily_frequency  INTEGER  DEFAULT 2
                     CHECK (daily_frequency IS NULL OR (daily_frequency >= 1 AND daily_frequency <= 10)),
  lock_duration    INTEGER  DEFAULT 0,
  modal_width_pct  INTEGER  DEFAULT 85,
  image_height_pct INTEGER  DEFAULT 35,
  start_hour       INTEGER  DEFAULT 7,
  -- Advertiser / Company
  company_name        TEXT,
  company_description TEXT,
  company_logo        TEXT,
  company_banner      TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  contact_address     TEXT,
  contact_website     TEXT,
  -- Targeting
  target_roles      TEXT[]   DEFAULT ARRAY['agent','landlord','tenant','employee'],
  target_provinces  TEXT[],
  target_districts  TEXT[],
  target_agency_ids UUID[],
  -- Schedule
  active      BOOLEAN  NOT NULL DEFAULT TRUE,
  start_date  DATE,
  end_date    DATE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── ad_impressions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id         UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shown_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  show_count    INTEGER NOT NULL DEFAULT 1,
  last_shown_at TIMESTAMPTZ,
  UNIQUE(ad_id, user_id, shown_date)
);

-- ── ad_interactions ──────────────────────────────────────────
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

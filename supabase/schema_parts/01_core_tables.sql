-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 01_core_tables.sql - Core tables
-- ============================================================

-- BOLUM 1: TEMEL TABLOLAR (bagimlilik sirasi)
-- Siralama: agencies -> users -> properties -> receipts ->
--   maintenance_requests -> notifications -> calendar_events ->
--   property_documents -> receipt_events -> maintenance_logs ->
--   ad_campaigns -> ad_impressions ->
--   team_tasks -> announcements -> announcement_recipients ->
--   team_messages
-- ============================================================

-- ── 1.1 agencies ────────────────────────────────────────────
-- Emlakci ofisi veya sirket. users.agency_id bu tabloya FK.
CREATE TABLE IF NOT EXISTS public.agencies (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type            TEXT NOT NULL DEFAULT 'office'
                           CHECK (entity_type IN ('office', 'company')),
  name                   TEXT NOT NULL,
  location               TEXT NOT NULL,
  address                TEXT,
  active_regions         TEXT[]   DEFAULT '{}',
  contact_email          TEXT,
  contact_phone          TEXT,
  logo_url               TEXT,
  banner_url             TEXT,
  brand_color_primary    TEXT     DEFAULT '#D4622B',
  brand_color_secondary  TEXT     DEFAULT '#2C1810',
  subscription_plan      TEXT     DEFAULT 'basic'
                           CHECK (subscription_plan IN ('free', 'basic', 'premium')),
  max_properties         INTEGER  DEFAULT 20,
  contract_start         DATE,
  contract_end           DATE,
  notes                  TEXT,
  status                 TEXT     DEFAULT 'active'
                           CHECK (status IN ('active', 'suspended', 'inactive')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.2 users ────────────────────────────────────────────────
-- Tum kullanici profilleri. auth.users ile auth_id uzerinden eslesir.
-- UYARI: Bu tablo sifirdan CREATE edilir; mevcut sistemde
--        01_schema_migration oncesi elle olusturulmustu.
CREATE TABLE IF NOT EXISTS public.users (
  id                     UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id                UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email                  TEXT UNIQUE NOT NULL,
  full_name              TEXT NOT NULL DEFAULT '',
  phone                  TEXT,
  role                   TEXT NOT NULL DEFAULT 'tenant'
                           CHECK (role IN ('admin', 'agent', 'employee', 'landlord', 'tenant')),
  status                 TEXT NOT NULL DEFAULT 'active'
                           CHECK (status IN ('pending', 'active')),
  agency_id              UUID REFERENCES public.agencies(id) ON DELETE SET NULL,
  created_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
  invited_via_invite_id  UUID,
  employee_access_level  TEXT
                           CHECK (
                             employee_access_level IS NULL
                             OR employee_access_level IN ('full', 'limited')
                           ),
  avatar_url             TEXT,
  brand_color_primary    TEXT,
  brand_color_secondary  TEXT,
  city                   TEXT,
  district               TEXT,
  push_token             TEXT,
  active                 BOOLEAN NOT NULL DEFAULT TRUE,
  preferred_currency     TEXT     DEFAULT 'TRY'
                           CHECK (preferred_currency IN ('TRY', 'USD', 'EUR')),
  preferred_theme        TEXT     DEFAULT 'system'
                           CHECK (preferred_theme IN ('light', 'dark', 'system')),
  -- Package 2 runtime integration is pending; keep these fields schema-ready.
  terms_accepted_at      TIMESTAMPTZ,
  first_login            BOOLEAN  NOT NULL DEFAULT TRUE,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Agent kontrollu tenant/landlord davetleri.
CREATE TABLE IF NOT EXISTS public.invites (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_owner_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  role                TEXT NOT NULL CHECK (role IN ('tenant', 'landlord')),
  contact_label       TEXT NOT NULL,
  token_hash          TEXT NOT NULL UNIQUE,
  code_hash           TEXT,
  prefill_full_name   TEXT,
  prefill_phone       TEXT,
  prefill_email       TEXT,
  expires_at          TIMESTAMPTZ NOT NULL,
  used_at             TIMESTAMPTZ,
  used_by             UUID REFERENCES public.users(id) ON DELETE SET NULL,
  revoked_at          TIMESTAMPTZ,
  revoked_by          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_reminded_at    TIMESTAMPTZ,
  reminder_count      INTEGER NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.users
  ADD CONSTRAINT users_invited_via_invite_id_fkey
  FOREIGN KEY (invited_via_invite_id) REFERENCES public.invites(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.invite_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invite_id       UUID REFERENCES public.invites(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL
                    CHECK (event_type IN ('created', 'registered', 'reminded', 'approved', 'rejected', 'label_updated', 'revoked')),
  actor_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  target_user_id  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  payload         JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.3 properties ───────────────────────────────────────────
-- Mulk kayitlari.
-- UYARI: Bu tablonun CREATE TABLE ifadesi hicbir migration
--        dosyasinda yoktu; sadece ALTER TABLE ile guncellenmisti.
CREATE TABLE IF NOT EXISTS public.properties (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  employee_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  landlord_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  address            TEXT NOT NULL,
  city               TEXT NOT NULL,
  district           TEXT NOT NULL,
  property_type      TEXT NOT NULL,        -- apartment, house, commercial
  description        TEXT,
  status             TEXT NOT NULL DEFAULT 'vacant'
                       CHECK (status IN ('vacant', 'occupied', 'maintenance')),
  monthly_rent       NUMERIC NOT NULL,
  dues_amount        NUMERIC,
  dues_day           INTEGER,
  rent_day           INTEGER,
  deposit_amount     NUMERIC,
  deposit_currency   TEXT DEFAULT 'TRY'
                       CHECK (deposit_currency IN ('TRY', 'USD', 'EUR')),
  contract_start     DATE,
  contract_end       DATE,
  contract_duration  INTEGER,
  area               NUMERIC,
  heating            TEXT,
  amenities          JSONB,
  is_furnished       BOOLEAN,
  images             TEXT[],
  -- Kiracı onboarding belge URL'leri (07_tenant_docs)
  identity_doc_url   TEXT,
  income_doc_url     TEXT,
  contract_doc_url   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.4 receipts ─────────────────────────────────────────────
-- Odeme ve dekont kayitlari.
-- UYARI: Bu tablonun CREATE TABLE ifadesi hicbir migration
--        dosyasinda yoktu.
CREATE TABLE IF NOT EXISTS public.receipts (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id                UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  uploaded_by                UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  reviewed_by                UUID REFERENCES public.users(id) ON DELETE SET NULL,
  replaces_receipt_id        UUID REFERENCES public.receipts(id) ON DELETE SET NULL,
  withdrawn_by               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  decision_revoked_by        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  receipt_type               TEXT NOT NULL
                               CHECK (receipt_type IN ('rent', 'dues', 'other')),
  amount                     NUMERIC NOT NULL,
  month                      TEXT NOT NULL,      -- YYYY-MM
  status                     TEXT NOT NULL DEFAULT 'pending'
                               CHECK (status IN ('pending', 'approved', 'rejected', 'withdrawn')),
  document_url               TEXT,
  storage_path               TEXT,
  notes                      TEXT,
  uploader_name              TEXT,
  reviewer_name              TEXT,
  auto_approved_at           TIMESTAMPTZ,
  pending_since_at           TIMESTAMPTZ,
  withdrawn_at               TIMESTAMPTZ,
  withdrawal_reason          TEXT,
  decision_revoked_at        TIMESTAMPTZ,
  decision_revocation_reason TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.5 maintenance_requests ─────────────────────────────────
-- Bakim ve ariza talepleri.
-- UYARI: Bu tablonun CREATE TABLE ifadesi hicbir migration
--        dosyasinda yoktu.
CREATE TABLE IF NOT EXISTS public.maintenance_requests (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id              UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  created_by               UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
  title                    TEXT NOT NULL,
  description              TEXT NOT NULL,
  status                   TEXT NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  priority                 TEXT NOT NULL DEFAULT 'medium'
                             CHECK (priority IN ('low', 'medium', 'high')),
  photo_urls               TEXT[]   DEFAULT '{}',
  creator_name             TEXT,
  creator_role             TEXT,
  issue_type               TEXT,
  seen_at                  TIMESTAMPTZ,
  seen_by                  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_approved_at       TIMESTAMPTZ,
  tenant_rejected_at       TIMESTAMPTZ,
  tenant_rejection_reason  TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.6 notifications ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,    -- maintenance | receipt | task | announcement | team_message
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  body        TEXT,             -- message ile senkronize, bazi istemciler body bekler
  related_id  UUID,             -- ilgili kaydin id'si (maintenance, receipt, task vb.)
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.7 calendar_events ──────────────────────────────────────
-- UYARI: Bu tablonun CREATE TABLE ifadesi hicbir migration
--        dosyasinda yoktu. Supabase'de muhtemelen elle olusturulmustu.
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_id   UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title       TEXT NOT NULL,
  event_type  TEXT,
  event_date  TIMESTAMPTZ NOT NULL,
  status      TEXT DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.8 property_documents ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.property_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id  UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
  category     TEXT NOT NULL,
  title        TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  storage_path TEXT,
  uploaded_by  UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.9 receipt_events ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.receipt_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id  UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  actor_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.10 maintenance_logs ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.maintenance_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id  UUID NOT NULL REFERENCES public.maintenance_requests(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  user_name   TEXT NOT NULL,
  user_role   TEXT NOT NULL,
  note        TEXT,
  photo_urls  TEXT[]   DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.11 ad_campaigns ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ad_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type             TEXT NOT NULL
                     CHECK (type IN ('inline_ad', 'news', 'testimonial', 'service', 'interstitial')),
  title            TEXT,
  body             TEXT,
  image_url        TEXT,
  link_url         TEXT,
  sort_order       INTEGER  DEFAULT 0,
  -- Testimonial alanlari
  client_name      TEXT,
  client_avatar    TEXT,
  client_rating    NUMERIC(2,1)
                     CHECK (client_rating IS NULL OR (client_rating >= 1.0 AND client_rating <= 5.0)),
  client_title     TEXT,
  client_company   TEXT,
  -- Service alanlari
  service_icon     TEXT,
  -- Interstitial alanlari
  daily_frequency  INTEGER  DEFAULT 2
                     CHECK (daily_frequency IS NULL OR (daily_frequency >= 1 AND daily_frequency <= 10)),
  lock_duration    INTEGER  DEFAULT 0,
  modal_width_pct  INTEGER  DEFAULT 85,
  image_height_pct INTEGER  DEFAULT 35,
  start_hour       INTEGER  DEFAULT 7,
  -- Advertiser / Company alanlari (AdminCampaignPayload ile eslesiyor)
  company_name        TEXT,
  company_description TEXT,
  company_logo        TEXT,
  company_banner      TEXT,
  contact_email       TEXT,
  contact_phone       TEXT,
  contact_address     TEXT,
  contact_website     TEXT,
  -- Hedefleme
  target_roles      TEXT[]   DEFAULT ARRAY['agent','landlord','tenant','employee'],
  target_provinces  TEXT[],
  target_districts  TEXT[],
  target_agency_ids UUID[],
  -- Zamanlama
  active      BOOLEAN  NOT NULL DEFAULT TRUE,
  start_date  DATE,
  end_date    DATE,
  -- Meta
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.12 ad_impressions ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ad_impressions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ad_id         UUID NOT NULL REFERENCES public.ad_campaigns(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  shown_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  show_count    INTEGER NOT NULL DEFAULT 1,
  last_shown_at TIMESTAMPTZ,
  UNIQUE(ad_id, user_id, shown_date)
);

-- ── 1.13 team_tasks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id                   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_owner_id      UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assignee_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  task_type            TEXT NOT NULL
                         CHECK (task_type IN (
                           'property_showing', 'office_meeting', 'client_meeting',
                           'document_delivery', 'site_visit'
                         )),
  title                TEXT NOT NULL,
  description          TEXT,
  property_id          UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  customer_name        TEXT,
  customer_phone       TEXT,
  scheduled_at         TIMESTAMPTZ NOT NULL,
  repeat_enabled       BOOLEAN NOT NULL DEFAULT FALSE,
  status               TEXT NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  started_at           TIMESTAMPTZ,
  completed_at         TIMESTAMPTZ,
  completion_note      TEXT,
  completion_photo_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.14 announcements ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcements (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_owner_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title            TEXT NOT NULL,
  body             TEXT NOT NULL,
  attachment_path  TEXT,
  attachment_kind  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.15 announcement_recipients ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_recipients (
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ,
  reminded_at     TIMESTAMPTZ,
  reminder_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);

-- ── 1.17 professions ────────────────────────────────────────
-- Teknikçi meslekleri (Elektrikçi, Sıvacı, vb.)
CREATE TABLE IF NOT EXISTS public.professions (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'Teknik Destek',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── 1.18 office_contacts ────────────────────────────────────
-- Teknik destek rehberi (Usta/Teknikçiler)
CREATE TABLE IF NOT EXISTS public.office_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  profession TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

-- Soft-delete protected unique constraint
CREATE UNIQUE INDEX IF NOT EXISTS idx_office_contacts_active_phone
ON public.office_contacts(office_id, phone)
WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_office_contacts_office_id
ON public.office_contacts(office_id);

-- ── 1.19 contact_nicknames ───────────────────────────────────
-- Her kullanıcının kişilere verdiği takma adlar
CREATE TABLE IF NOT EXISTS public.contact_nicknames (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.office_contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, user_id)
);

-- ── 1.20 team_messages ──────────────────────────────────────
-- Office icinde kullanicilar arasinda iletisim
CREATE TABLE IF NOT EXISTS public.team_messages (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id     UUID NOT NULL REFERENCES public.agencies(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content       TEXT NOT NULL CHECK (char_length(content) <= 4000),
  file_url      TEXT,
  file_name     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── Add maintenance_requests technician columns ─────────────
-- Arızaya atanan usta ve silinmiş usta snapshot'ı
ALTER TABLE IF EXISTS public.maintenance_requests
ADD COLUMN IF NOT EXISTS assigned_technician_id UUID REFERENCES public.office_contacts(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS assigned_technician_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_technician
ON public.maintenance_requests(assigned_technician_id);

-- ============================================================

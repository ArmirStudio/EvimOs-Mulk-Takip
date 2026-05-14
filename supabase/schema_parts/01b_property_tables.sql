-- ============================================================
-- Run order: 01b — Property & Financial tables
-- Tablolar: properties, receipts, maintenance_requests,
--           calendar_events, property_documents,
--           receipt_events, maintenance_logs
-- ============================================================

-- ── 1.5 properties ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.properties (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agent_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  employee_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  landlord_id        UUID REFERENCES public.users(id) ON DELETE SET NULL,
  tenant_id          UUID REFERENCES public.users(id) ON DELETE SET NULL,
  address            TEXT NOT NULL,
  city               TEXT NOT NULL,
  district           TEXT NOT NULL,
  property_type      TEXT NOT NULL,
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
  identity_doc_url   TEXT,
  income_doc_url     TEXT,
  contract_doc_url   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.6 receipts ─────────────────────────────────────────────
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
  month                      TEXT NOT NULL,
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

-- ── 1.7 maintenance_requests ─────────────────────────────────
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
-- NOTE: assigned_technician_id FK is added in 01c_team_tables.sql after office_contacts is created.

-- ── 1.8 calendar_events ──────────────────────────────────────
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

-- ── 1.9 property_documents ───────────────────────────────────
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

-- ── 1.10 receipt_events ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.receipt_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id  UUID NOT NULL REFERENCES public.receipts(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  actor_id    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  detail      TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.11 maintenance_logs ────────────────────────────────────
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

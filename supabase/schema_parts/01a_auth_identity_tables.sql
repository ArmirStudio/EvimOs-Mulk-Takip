-- ============================================================
-- Run order: 01a — Auth & Identity tables
-- Tablolar: agencies, users, invites, invite_events
-- ============================================================

-- ── 1.1 agencies ────────────────────────────────────────────
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
  terms_accepted_at      TIMESTAMPTZ,
  first_login            BOOLEAN  NOT NULL DEFAULT TRUE,
  onboarded_at           TIMESTAMPTZ,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 1.3 invites ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  office_owner_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  role                  TEXT NOT NULL CHECK (role IN ('tenant', 'landlord', 'employee')),
  contact_label         TEXT NOT NULL,
  token_hash            TEXT NOT NULL UNIQUE,
  code_hash             TEXT,
  prefill_full_name     TEXT,
  prefill_phone         TEXT,
  prefill_email         TEXT,
  employee_access_level TEXT CHECK (
                          employee_access_level IS NULL
                          OR employee_access_level IN ('full', 'limited')
                        ),
  expires_at            TIMESTAMPTZ NOT NULL,
  used_at               TIMESTAMPTZ,
  used_by               UUID REFERENCES public.users(id) ON DELETE SET NULL,
  revoked_at            TIMESTAMPTZ,
  revoked_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  last_reminded_at      TIMESTAMPTZ,
  reminder_count        INTEGER NOT NULL DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Circular FK: users.invited_via_invite_id → invites.id
ALTER TABLE public.users
  ADD CONSTRAINT users_invited_via_invite_id_fkey
  FOREIGN KEY (invited_via_invite_id) REFERENCES public.invites(id) ON DELETE SET NULL;

-- ── 1.4 invite_events ────────────────────────────────────────
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

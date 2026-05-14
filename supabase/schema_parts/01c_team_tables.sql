-- ============================================================
-- Run order: 01c — Team & Office tables
-- Tablolar: team_tasks, announcements, announcement_recipients,
--           professions, office_contacts, contact_nicknames,
--           team_messages, team_message_attachments,
--           office_expenses, team_meetings
-- ============================================================

-- ── team_tasks ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_tasks (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_owner_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by            UUID REFERENCES public.users(id) ON DELETE SET NULL,
  assignee_id           UUID REFERENCES public.users(id) ON DELETE SET NULL,
  task_type             TEXT NOT NULL
                          CHECK (task_type IN (
                            'property_showing', 'office_meeting', 'client_meeting',
                            'document_delivery', 'site_visit'
                          )),
  title                 TEXT NOT NULL,
  description           TEXT,
  property_id           UUID REFERENCES public.properties(id) ON DELETE SET NULL,
  customer_name         TEXT,
  customer_phone        TEXT,
  scheduled_at          TIMESTAMPTZ NOT NULL,
  repeat_enabled        BOOLEAN NOT NULL DEFAULT FALSE,
  status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  started_at            TIMESTAMPTZ,
  completed_at          TIMESTAMPTZ,
  completion_note       TEXT,
  completion_photo_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── announcements ────────────────────────────────────────────
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

-- ── announcement_recipients ───────────────────────────────────
CREATE TABLE IF NOT EXISTS public.announcement_recipients (
  announcement_id UUID NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  read_at         TIMESTAMPTZ,
  reminded_at     TIMESTAMPTZ,
  reminder_count  INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (announcement_id, user_id)
);

-- ── professions ──────────────────────────────────────────────
-- Teknisyen meslek listesi (Elektrikçi, Sıvacı, vb.)
CREATE TABLE IF NOT EXISTS public.professions (
  id         SERIAL PRIMARY KEY,
  name       TEXT NOT NULL UNIQUE,
  category   TEXT DEFAULT 'Teknik Destek',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── office_contacts ───────────────────────────────────────────
-- Teknik destek rehberi (ustalar / teknikçiler)
CREATE TABLE IF NOT EXISTS public.office_contacts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL,
  email      TEXT,
  profession TEXT NOT NULL,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  deleted_at TIMESTAMPTZ,
  deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_office_contacts_active_phone
  ON public.office_contacts(office_id, phone)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_office_contacts_office_id
  ON public.office_contacts(office_id);

-- ── contact_nicknames ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.contact_nicknames (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  contact_id UUID NOT NULL REFERENCES public.office_contacts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  nickname   TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id, user_id)
);

-- ── maintenance_requests: teknisyen sütunları ─────────────────
-- office_contacts tanımlandıktan sonra ekleniyor
ALTER TABLE public.maintenance_requests
  ADD COLUMN IF NOT EXISTS assigned_technician_id       UUID REFERENCES public.office_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assigned_technician_snapshot JSONB;

CREATE INDEX IF NOT EXISTS idx_maintenance_assigned_technician
  ON public.maintenance_requests(assigned_technician_id);

-- ── team_messages ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_messages (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  body            TEXT NOT NULL CHECK (char_length(body) <= 4000),
  reply_to_id     UUID REFERENCES public.team_messages(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── team_message_attachments ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_message_attachments (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id      UUID NOT NULL REFERENCES public.team_messages(id) ON DELETE CASCADE,
  office_owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  uploaded_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  bucket          TEXT NOT NULL DEFAULT 'team-message-files' CHECK (bucket = 'team-message-files'),
  storage_path    TEXT NOT NULL,
  file_name       TEXT NOT NULL,
  mime_type       TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes      INTEGER CHECK (size_bytes IS NULL OR (size_bytes > 0 AND size_bytes <= 10485760)),
  kind            TEXT NOT NULL CHECK (kind IN ('image', 'document', 'file')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── office_expenses ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.office_expenses (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  amount          NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  category        TEXT NOT NULL CHECK (category IN ('kira','fatura','ulasim','yemek','malzeme','diger')),
  description     TEXT,
  expense_date    DATE NOT NULL,
  receipt_url     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS office_expenses_office_idx   ON public.office_expenses(office_owner_id);
CREATE INDEX IF NOT EXISTS office_expenses_date_idx     ON public.office_expenses(expense_date);
CREATE INDEX IF NOT EXISTS office_expenses_creator_idx  ON public.office_expenses(created_by);

-- ── team_meetings ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_meetings (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  office_owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_by      UUID REFERENCES public.users(id) ON DELETE SET NULL,
  title           TEXT NOT NULL,
  description     TEXT,
  scheduled_at    TIMESTAMPTZ NOT NULL,
  notes           TEXT,
  status          TEXT NOT NULL DEFAULT 'scheduled'
                    CHECK (status IN ('scheduled', 'completed', 'cancelled')),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS team_meetings_office_idx     ON public.team_meetings(office_owner_id);
CREATE INDEX IF NOT EXISTS team_meetings_scheduled_idx  ON public.team_meetings(scheduled_at);

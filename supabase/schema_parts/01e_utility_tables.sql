-- ============================================================
-- Run order: 01e — Utility tables
-- Tablolar: notifications
-- ============================================================

-- ── notifications ────────────────────────────────────────────
-- Push/in-app notification kayıtları. Backend service_role ile yazar.
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  body        TEXT,
  related_id  UUID,
  read        BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

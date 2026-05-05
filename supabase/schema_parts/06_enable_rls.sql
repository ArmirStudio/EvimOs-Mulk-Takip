-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 06_enable_rls.sql - Enable RLS
-- ============================================================

-- BOLUM 6: ROW LEVEL SECURITY — ETKINLESTIR
-- ============================================================

ALTER TABLE public.users                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invite_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agencies              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_documents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt_events        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_logs      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_campaigns          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ad_impressions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_tasks            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_messages         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.office_contacts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_nicknames     ENABLE ROW LEVEL SECURITY;


-- ============================================================

-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 08_grants.sql - Postgres grants
-- ============================================================

-- BOLUM 8: POSTGRES GRANT'LER
-- Tablolarin PostgREST uzerinden erisilebilir olmasi icin.
-- service_role zaten tum yetkilere sahiptir; bunlar
-- authenticated ve anon rolleri icindir.
-- ============================================================

-- ad_campaigns: herkes okuyabilir (RLS aktif zaten sinirlayacak)
GRANT SELECT ON public.ad_campaigns TO authenticated, anon;
GRANT ALL    ON public.ad_campaigns TO service_role;

-- ad_impressions: authenticated okur/yazar
GRANT SELECT, INSERT, UPDATE ON public.ad_impressions TO authenticated;
GRANT ALL                    ON public.ad_impressions TO service_role;

-- receipt_events: authenticated okur/ekler
GRANT SELECT, INSERT ON public.receipt_events TO authenticated;
GRANT SELECT, INSERT ON public.receipt_events TO anon;
GRANT ALL            ON public.receipt_events TO service_role;

-- maintenance_logs: authenticated okur/ekler
GRANT SELECT, INSERT, UPDATE ON public.maintenance_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.maintenance_logs TO anon;
GRANT ALL                    ON public.maintenance_logs TO service_role;

-- users: client profil okumasi RLS ile sinirli, push_token guncellemesi kolon bazli
GRANT SELECT ON TABLE public.users TO authenticated;
GRANT UPDATE (push_token) ON TABLE public.users TO authenticated;

-- invites: backend service_role yazar; authenticated yalniz ofis kapsaminda okur
GRANT SELECT ON public.invites, public.invite_events TO authenticated;
GRANT ALL    ON public.invites, public.invite_events TO service_role;

-- team_tasks, announcements, announcement_recipients, team_messages
GRANT SELECT, INSERT, UPDATE, DELETE ON public.team_tasks              TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.announcements           TO authenticated;
GRANT SELECT, INSERT, UPDATE         ON public.announcement_recipients TO authenticated;
GRANT SELECT, INSERT                 ON public.team_messages           TO authenticated;
GRANT ALL ON public.team_tasks, public.announcements,
            public.announcement_recipients, public.team_messages
  TO service_role;

-- professions: herkes okuyabilir (dropdown için)
GRANT SELECT ON public.professions TO authenticated, anon;
GRANT ALL    ON public.professions TO service_role;

-- office_contacts: agent ve employee yönetir, tenant/landlord okur (RLS ile kısıtlı)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.office_contacts       TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.contact_nicknames    TO authenticated;
GRANT ALL ON public.office_contacts, public.contact_nicknames TO service_role;


-- ============================================================

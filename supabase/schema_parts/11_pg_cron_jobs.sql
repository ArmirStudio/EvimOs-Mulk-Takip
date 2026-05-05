-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 11_pg_cron_jobs.sql - pg_cron jobs
-- ============================================================

-- BOLUM 11: pg_cron GOREVLERI (Supabase Pro gerektirir)
-- Pro plan'da SELECT cron.schedule(...) ile ekle.
-- Free plan'da bu blogu atlayip manuel/backend
-- ile zamanla ya da skip et.
-- ============================================================

-- Auto-approve receipts: Her gun saat 00:01'de
-- SELECT cron.schedule(
--   'auto-approve-receipts',
--   '1 0 * * *',
--   $$
--   UPDATE public.receipts
--     SET status = 'approved', auto_approved_at = NOW(), updated_at = NOW()
--   WHERE status = 'pending'
--     AND created_at < NOW() - INTERVAL '4 days';
--   $$
-- );

-- Cleanup old calendar events: Her gun saat 02:00'da
-- SELECT cron.schedule(
--   'cleanup-old-calendar-events',
--   '0 2 * * *',
--   'SELECT public.cleanup_old_calendar_events()'
-- );


-- ============================================================

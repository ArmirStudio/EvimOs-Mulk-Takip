-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 12_verification_queries.sql - Verification queries
-- ============================================================

-- BOLUM 12: DOGRULAMA SORGULARI
-- Calistirdiktan sonra asagidakileri kontrol et:
-- ============================================================

-- Tablolar olusturuldu mu?
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' ORDER BY table_name;

-- RLS aktif mi?
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' ORDER BY tablename;

-- Politikalar listesi:
-- SELECT tablename, policyname, cmd FROM pg_policies
-- WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Fonksiyonlar var mi?
-- SELECT proname FROM pg_proc
-- WHERE pronamespace = 'public'::regnamespace ORDER BY proname;

-- Trigger var mi?
-- SELECT trigger_name, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public' OR event_object_schema = 'auth'
-- ORDER BY trigger_name;

-- Storage bucket'lari:
-- SELECT id, name, public FROM storage.buckets ORDER BY id;

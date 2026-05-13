-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 09_storage_buckets.sql - Storage buckets
-- ============================================================

-- BOLUM 9: STORAGE BUCKET'LARI
-- SQL uzerinden INSERT ile olusturulur.
-- Tum bucket'lar varsayilan olarak private (public=false)
-- olarak tanimlanir — 21_office_isolation_receipt_undo
-- kararini esas alir.
--
-- NOT: Supabase Dashboard > Storage'dan da olusturulabilir.
--      AUDIT_REPORT.md'de manuel adim olarak listelenmistir.
-- ============================================================

-- Hassas belgeler: private
INSERT INTO storage.buckets (id, name, public)
VALUES ('receipts', 'receipts', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-documents', 'property-documents', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('maintenance-photos', 'maintenance-photos', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('team-message-files', 'team-message-files', FALSE, 10485760)
ON CONFLICT (id) DO UPDATE SET public = FALSE, file_size_limit = 10485760;

-- Genel erisim: public
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('agency-branding', 'agency-branding', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('ad-media', 'ad-media', TRUE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('property-images', 'property-images', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Hassas/office-scope dosyalar: private
INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-files', 'announcement-files', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

-- ============================================================

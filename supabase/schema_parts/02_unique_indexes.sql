-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 02_unique_indexes.sql - Unique indexes
-- ============================================================

-- BOLUM 2: UNIQUE INDEX'LER
-- ============================================================

-- Bir kiraci en fazla bir mulke atanabilir
CREATE UNIQUE INDEX IF NOT EXISTS properties_unique_tenant_id
  ON public.properties(tenant_id)
  WHERE tenant_id IS NOT NULL;


-- ============================================================

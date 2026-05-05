-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 04_rls_helper_functions.sql - RLS helper functions
-- ============================================================

-- BOLUM 4: YARDIMCI FONKSIYONLAR (RLS icin)
-- SECURITY DEFINER: RLS'yi bypass ederek rol bilgisini okur,
-- bu sayede users tablosunda recursive policy tetiklenmez.
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT id FROM public.users WHERE auth_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT role FROM public.users WHERE auth_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_current_employee_access_level()
RETURNS TEXT
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT employee_access_level FROM public.users WHERE auth_id = auth.uid() LIMIT 1
$$;

-- Employee'nin bagli oldugu office sahibinin id'si
-- Agent ise kendi id'sini dondurur; employee ise created_by'yi dondurur
CREATE OR REPLACE FUNCTION public.get_current_office_owner_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    CASE
      WHEN role = 'employee' THEN COALESCE(created_by, id)
      ELSE id
    END
  FROM public.users
  WHERE auth_id = auth.uid()
  LIMIT 1
$$;

-- Employee full access kontrolu
CREATE OR REPLACE FUNCTION public.is_full_employee()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role = 'employee' AND employee_access_level = 'full'
     FROM public.users WHERE auth_id = auth.uid() LIMIT 1),
    FALSE
  )
$$;

-- Mulke erisim hakkini kontrol eder (admin/agent/full-employee/atanmis/landlord/tenant)
CREATE OR REPLACE FUNCTION public.current_user_can_view_property(target_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = target_property_id
      AND (
        public.get_current_user_role() = 'admin'
        OR (
          public.get_current_user_role() = 'agent'
          AND p.agent_id = public.get_current_user_id()
        )
        OR (
          public.get_current_user_role() = 'employee'
          AND public.is_full_employee()
          AND p.agent_id = public.get_current_office_owner_id()
        )
        OR p.employee_id = public.get_current_user_id()
        OR p.landlord_id = public.get_current_user_id()
        OR p.tenant_id   = public.get_current_user_id()
      )
  )
$$;

-- Mulku yonetme hakkini kontrol eder (admin/agent/full-employee)
CREATE OR REPLACE FUNCTION public.current_user_can_manage_property(target_property_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.properties p
    WHERE p.id = target_property_id
      AND (
        public.get_current_user_role() = 'admin'
        OR (
          public.get_current_user_role() = 'agent'
          AND p.agent_id = public.get_current_user_id()
        )
        OR (
          public.get_current_user_role() = 'employee'
          AND public.is_full_employee()
          AND p.agent_id = public.get_current_office_owner_id()
        )
      )
  )
$$;

-- Maintenance scope goruntu hakkini kontrol eder
CREATE OR REPLACE FUNCTION public.current_user_can_view_maintenance_scope(target_scope_id UUID)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT
    public.current_user_can_view_property(target_scope_id)
    OR EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = target_scope_id
        AND public.current_user_can_view_property(mr.property_id)
    )
$$;

-- Office izolasyon fonksiyonu: team scope kontrolu
CREATE OR REPLACE FUNCTION public.current_user_office_owner_id()
RETURNS UUID
LANGUAGE sql SECURITY DEFINER STABLE
SET search_path = public
AS $$
  SELECT public.get_current_office_owner_id()
$$;


-- ============================================================

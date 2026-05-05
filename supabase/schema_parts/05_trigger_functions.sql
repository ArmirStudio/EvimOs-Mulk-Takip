-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 05_trigger_functions.sql - Trigger functions
-- ============================================================

-- BOLUM 5: TRIGGER FONKSIYONLARI
-- ============================================================

-- auth.users INSERT tetikleyicisi: profil otomatik olustur
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_role TEXT := COALESCE(NEW.raw_user_meta_data->>'role', 'tenant');
BEGIN
  INSERT INTO public.users (
    auth_id, email, role, full_name, phone,
    status, city, district, employee_access_level, active, created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    new_role,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.raw_user_meta_data->>'phone',
    COALESCE(NULLIF(NEW.raw_user_meta_data->>'status', ''), 'active'),
    NULLIF(NEW.raw_user_meta_data->>'city', ''),
    NULLIF(NEW.raw_user_meta_data->>'district', ''),
    CASE
      WHEN new_role = 'employee'
        THEN COALESCE(NULLIF(NEW.raw_user_meta_data->>'employee_access_level', ''), 'limited')
      ELSE NULL
    END,
    TRUE,
    NOW()
  )
  ON CONFLICT (auth_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at otomatik guncelleme fonksiyonu
CREATE OR REPLACE FUNCTION public.update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- agencies updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.agencies;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.agencies
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- ad_campaigns updated_at trigger
CREATE OR REPLACE FUNCTION public.update_ad_campaigns_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_ad_campaigns_updated_at ON public.ad_campaigns;
CREATE TRIGGER update_ad_campaigns_updated_at
  BEFORE UPDATE ON public.ad_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_ad_campaigns_updated_at();

-- office_contacts updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.office_contacts;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.office_contacts
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- maintenance_requests updated_at trigger
DROP TRIGGER IF EXISTS handle_updated_at ON public.maintenance_requests;
CREATE TRIGGER handle_updated_at
  BEFORE UPDATE ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- users updated_at trigger
DROP TRIGGER IF EXISTS update_users_modtime ON public.users;
CREATE TRIGGER update_users_modtime
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- receipts updated_at trigger
DROP TRIGGER IF EXISTS update_receipts_modtime ON public.receipts;
CREATE TRIGGER update_receipts_modtime
  BEFORE UPDATE ON public.receipts
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- properties updated_at trigger
DROP TRIGGER IF EXISTS update_properties_modtime ON public.properties;
CREATE TRIGGER update_properties_modtime
  BEFORE UPDATE ON public.properties
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- invites updated_at trigger
DROP TRIGGER IF EXISTS update_invites_modtime ON public.invites;
CREATE TRIGGER update_invites_modtime
  BEFORE UPDATE ON public.invites
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- team_tasks updated_at trigger
DROP TRIGGER IF EXISTS update_team_tasks_modtime ON public.team_tasks;
CREATE TRIGGER update_team_tasks_modtime
  BEFORE UPDATE ON public.team_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- announcements updated_at trigger
DROP TRIGGER IF EXISTS update_announcements_modtime ON public.announcements;
CREATE TRIGGER update_announcements_modtime
  BEFORE UPDATE ON public.announcements
  FOR EACH ROW EXECUTE FUNCTION public.update_modified_column();

-- calendar_events otomatik temizlik fonksiyonu (12_fix baz alan)
CREATE OR REPLACE FUNCTION public.cleanup_old_calendar_events()
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  DELETE FROM public.calendar_events
  WHERE event_date < NOW() - INTERVAL '30 days';
END;
$$;


-- ============================================================

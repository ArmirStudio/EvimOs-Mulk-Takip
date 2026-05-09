-- Employee rehber yetkisi: tum employee seviyeleri ofis rehberindeki usta
-- kayitlarini yonetebilir. Property/user/invite yetkileri bu migration ile
-- degismez; kapsam yalnizca office_contacts RLS policy'leridir.

DROP POLICY IF EXISTS "office_contacts_insert" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_update" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_delete" ON public.office_contacts;

CREATE POLICY "office_contacts_insert" ON public.office_contacts
  FOR INSERT WITH CHECK (
    office_id = public.get_current_office_owner_id()
    AND created_by = public.get_current_user_id()
    AND public.get_current_user_role() IN ('agent', 'employee')
  );

CREATE POLICY "office_contacts_update" ON public.office_contacts
  FOR UPDATE USING (
    office_id = public.get_current_office_owner_id()
    AND public.get_current_user_role() IN ('agent', 'employee')
  )
  WITH CHECK (
    office_id = public.get_current_office_owner_id()
    AND public.get_current_user_role() IN ('agent', 'employee')
  );

CREATE POLICY "office_contacts_delete" ON public.office_contacts
  FOR UPDATE USING (
    office_id = public.get_current_office_owner_id()
    AND public.get_current_user_role() IN ('agent', 'employee')
  )
  WITH CHECK (
    office_id = public.get_current_office_owner_id()
    AND public.get_current_user_role() IN ('agent', 'employee')
  );

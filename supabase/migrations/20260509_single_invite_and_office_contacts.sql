-- Single invite onboarding and office contact scope alignment

ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS invites_role_check;

ALTER TABLE public.invites
  ADD CONSTRAINT invites_role_check
    CHECK (role IN ('tenant', 'landlord', 'employee'));

ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS employee_access_level TEXT;

ALTER TABLE public.invites
  DROP CONSTRAINT IF EXISTS invites_employee_access_level_check;

ALTER TABLE public.invites
  ADD CONSTRAINT invites_employee_access_level_check
    CHECK (
      employee_access_level IS NULL
      OR employee_access_level IN ('full', 'limited')
    );

ALTER TABLE public.office_contacts
  DROP CONSTRAINT IF EXISTS office_contacts_office_id_fkey;

ALTER TABLE public.office_contacts
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.office_contacts
  ADD CONSTRAINT office_contacts_office_id_fkey
    FOREIGN KEY (office_id) REFERENCES public.users(id) ON DELETE CASCADE
    NOT VALID;

DROP POLICY IF EXISTS "office_contacts_agent_read" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_employee_read" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_tenant_read" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_insert" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_update" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_delete" ON public.office_contacts;

CREATE POLICY "office_contacts_agent_read" ON public.office_contacts
  FOR SELECT USING (
    office_id = public.get_current_office_owner_id()
    AND public.get_current_user_role() = 'agent'
  );

CREATE POLICY "office_contacts_employee_read" ON public.office_contacts
  FOR SELECT USING (
    office_id = public.get_current_office_owner_id()
    AND public.get_current_user_role() = 'employee'
    AND deleted_at IS NULL
  );

CREATE POLICY "office_contacts_tenant_read" ON public.office_contacts
  FOR SELECT USING (
    deleted_at IS NULL
    AND office_id IN (
      SELECT DISTINCT p.agent_id
      FROM public.properties p
      WHERE (p.tenant_id = public.get_current_user_id() OR p.landlord_id = public.get_current_user_id())
        AND p.agent_id IS NOT NULL
    )
  );

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

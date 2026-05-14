-- ============================================================
-- Run order: 07a — RLS policies: Auth & Identity
-- Tablolar: users, invites, invite_events, agencies
-- ============================================================

-- ── USERS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_read"         ON public.users;
DROP POLICY IF EXISTS "users_insert"       ON public.users;
DROP POLICY IF EXISTS "users_update_self"  ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;

CREATE POLICY "users_read" ON public.users
  FOR SELECT USING (
    auth_id = auth.uid()
    OR public.get_current_user_role() = 'admin'
    OR (
      public.get_current_user_role() = 'agent'
      AND (id = public.get_current_user_id() OR created_by = public.get_current_user_id())
    )
    OR (
      public.get_current_user_role() = 'employee'
      AND public.is_full_employee()
      AND (
        id = public.get_current_office_owner_id()
        OR created_by = public.get_current_office_owner_id()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.properties p
      WHERE public.current_user_can_view_property(p.id)
        AND public.users.id IN (p.agent_id, p.employee_id, p.landlord_id, p.tenant_id)
    )
  );

-- INSERT kasitli olarak tanimlanmadi — sadece trigger/service_role kullanir.

CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE USING (id = public.get_current_user_id())
  WITH CHECK (id = public.get_current_user_id());

CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');


-- ── INVITES ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "invites_read"         ON public.invites;
DROP POLICY IF EXISTS "invites_insert"       ON public.invites;
DROP POLICY IF EXISTS "invites_update"       ON public.invites;
DROP POLICY IF EXISTS "invite_events_read"   ON public.invite_events;
DROP POLICY IF EXISTS "invite_events_insert" ON public.invite_events;

CREATE POLICY "invites_read" ON public.invites
  FOR SELECT USING (
    public.get_current_user_role() = 'admin'
    OR office_owner_id = public.get_current_office_owner_id()
    OR used_by = public.get_current_user_id()
  );

CREATE POLICY "invites_insert" ON public.invites
  FOR INSERT WITH CHECK (
    public.get_current_user_role() = 'admin'
    OR office_owner_id = public.get_current_user_id()
    OR (
      public.is_full_employee()
      AND office_owner_id = public.get_current_office_owner_id()
    )
  );

CREATE POLICY "invites_update" ON public.invites
  FOR UPDATE USING (
    public.get_current_user_role() = 'admin'
    OR office_owner_id = public.get_current_office_owner_id()
  )
  WITH CHECK (
    public.get_current_user_role() = 'admin'
    OR office_owner_id = public.get_current_office_owner_id()
  );

CREATE POLICY "invite_events_read" ON public.invite_events
  FOR SELECT USING (
    public.get_current_user_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM public.invites i
      WHERE i.id = invite_id
        AND i.office_owner_id = public.get_current_office_owner_id()
    )
  );

CREATE POLICY "invite_events_insert" ON public.invite_events
  FOR INSERT WITH CHECK (public.get_current_user_role() = 'admin');


-- ── AGENCIES ────────────────────────────────────────────────
DROP POLICY IF EXISTS "admins_view_all_agencies"  ON public.agencies;
DROP POLICY IF EXISTS "admins_insert_agencies"    ON public.agencies;
DROP POLICY IF EXISTS "admins_update_agencies"    ON public.agencies;
DROP POLICY IF EXISTS "admins_delete_agencies"    ON public.agencies;
DROP POLICY IF EXISTS "users_view_own_agency"     ON public.agencies;
DROP POLICY IF EXISTS "Admins can view all agencies"    ON public.agencies;
DROP POLICY IF EXISTS "Admins can insert agencies"      ON public.agencies;
DROP POLICY IF EXISTS "Admins can update agencies"      ON public.agencies;
DROP POLICY IF EXISTS "Admins can delete agencies"      ON public.agencies;
DROP POLICY IF EXISTS "Users can view their own agency" ON public.agencies;

CREATE POLICY "admins_view_all_agencies" ON public.agencies
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_insert_agencies" ON public.agencies
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_update_agencies" ON public.agencies
  FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin'));

CREATE POLICY "admins_delete_agencies" ON public.agencies
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.users WHERE auth_id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "users_view_own_agency" ON public.agencies
  FOR SELECT USING (
    id = (SELECT agency_id FROM public.users WHERE auth_id = auth.uid())
  );

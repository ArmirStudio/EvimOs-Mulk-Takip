-- ============================================================
-- Run order: 07c — RLS policies: Team & Office
-- Tablolar: team_tasks, announcements, announcement_recipients,
--           office_contacts, professions, contact_nicknames,
--           team_messages, team_message_attachments,
--           office_expenses, team_meetings
-- ============================================================

-- ── TEAM_TASKS ──────────────────────────────────────────────
DROP POLICY IF EXISTS "team_tasks_read"   ON public.team_tasks;
DROP POLICY IF EXISTS "team_tasks_insert" ON public.team_tasks;
DROP POLICY IF EXISTS "team_tasks_update" ON public.team_tasks;
DROP POLICY IF EXISTS "team_tasks_delete" ON public.team_tasks;

CREATE POLICY "team_tasks_read" ON public.team_tasks
  FOR SELECT USING (
    office_owner_id = public.get_current_office_owner_id()
    OR assignee_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "team_tasks_insert" ON public.team_tasks
  FOR INSERT WITH CHECK (
    office_owner_id = public.get_current_user_id()
    OR (
      public.is_full_employee()
      AND office_owner_id = public.get_current_office_owner_id()
    )
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "team_tasks_update" ON public.team_tasks
  FOR UPDATE USING (
    office_owner_id = public.get_current_office_owner_id()
    OR assignee_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    office_owner_id = public.get_current_office_owner_id()
    OR assignee_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "team_tasks_delete" ON public.team_tasks
  FOR DELETE USING (
    office_owner_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );


-- ── ANNOUNCEMENTS ───────────────────────────────────────────
DROP POLICY IF EXISTS "announcements_read"   ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;

CREATE POLICY "announcements_read" ON public.announcements
  FOR SELECT USING (
    office_owner_id = public.get_current_office_owner_id()
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "announcements_insert" ON public.announcements
  FOR INSERT WITH CHECK (
    office_owner_id = public.get_current_user_id()
    OR (
      public.is_full_employee()
      AND office_owner_id = public.get_current_office_owner_id()
    )
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "announcements_update" ON public.announcements
  FOR UPDATE USING (
    office_owner_id = public.get_current_office_owner_id()
    OR public.get_current_user_role() = 'admin'
  )
  WITH CHECK (
    office_owner_id = public.get_current_office_owner_id()
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "announcements_delete" ON public.announcements
  FOR DELETE USING (
    office_owner_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );


-- ── ANNOUNCEMENT_RECIPIENTS ─────────────────────────────────
DROP POLICY IF EXISTS "ann_recipients_read"   ON public.announcement_recipients;
DROP POLICY IF EXISTS "ann_recipients_insert" ON public.announcement_recipients;
DROP POLICY IF EXISTS "ann_recipients_update" ON public.announcement_recipients;

CREATE POLICY "ann_recipients_read" ON public.announcement_recipients
  FOR SELECT USING (
    user_id = public.get_current_user_id()
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id
        AND a.office_owner_id = public.get_current_office_owner_id()
    )
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "ann_recipients_insert" ON public.announcement_recipients
  FOR INSERT WITH CHECK (
    user_id = public.get_current_user_id()
    OR EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_id
        AND (
          a.created_by = public.get_current_user_id()
          OR a.office_owner_id = public.get_current_office_owner_id()
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

CREATE POLICY "ann_recipients_update" ON public.announcement_recipients
  FOR UPDATE USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());


-- ── OFFICE_CONTACTS ─────────────────────────────────────────
DROP POLICY IF EXISTS "office_contacts_agent_read"    ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_employee_read" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_tenant_read"   ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_insert"        ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_update"        ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_delete"        ON public.office_contacts;

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


-- ── PROFESSIONS ─────────────────────────────────────────────
DROP POLICY IF EXISTS "professions_read" ON public.professions;

CREATE POLICY "professions_read" ON public.professions
  FOR SELECT USING (TRUE);


-- ── CONTACT_NICKNAMES ────────────────────────────────────────
DROP POLICY IF EXISTS "contact_nicknames_read"  ON public.contact_nicknames;
DROP POLICY IF EXISTS "contact_nicknames_write" ON public.contact_nicknames;

CREATE POLICY "contact_nicknames_read" ON public.contact_nicknames
  FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "contact_nicknames_write" ON public.contact_nicknames
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());


-- ── TEAM_MESSAGES ────────────────────────────────────────────
DROP POLICY IF EXISTS "team_messages_read"   ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_insert" ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_delete" ON public.team_messages;

CREATE POLICY "team_messages_read" ON public.team_messages
  FOR SELECT USING (
    office_owner_id = public.get_current_office_owner_id()
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "team_messages_insert" ON public.team_messages
  FOR INSERT WITH CHECK (
    sender_id = public.get_current_user_id()
    AND office_owner_id = public.get_current_office_owner_id()
    AND (reply_to_id IS NULL OR EXISTS (
      SELECT 1 FROM public.team_messages tm
      WHERE tm.id = public.team_messages.reply_to_id
        AND tm.office_owner_id = public.team_messages.office_owner_id
    ))
  );

CREATE POLICY "team_messages_delete" ON public.team_messages
  FOR DELETE USING (
    sender_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );

DROP POLICY IF EXISTS "team_message_attachments_read"   ON public.team_message_attachments;
DROP POLICY IF EXISTS "team_message_attachments_insert" ON public.team_message_attachments;

CREATE POLICY "team_message_attachments_read" ON public.team_message_attachments
  FOR SELECT USING (
    office_owner_id = public.get_current_office_owner_id()
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "team_message_attachments_insert" ON public.team_message_attachments
  FOR INSERT WITH CHECK (
    uploaded_by = public.get_current_user_id()
    AND office_owner_id = public.get_current_office_owner_id()
    AND bucket = 'team-message-files'
    AND storage_path LIKE (office_owner_id::text || '/' || uploaded_by::text || '/%')
    AND EXISTS (
      SELECT 1 FROM public.team_messages tm
      WHERE tm.id = public.team_message_attachments.message_id
        AND tm.office_owner_id = public.team_message_attachments.office_owner_id
    )
  );


-- ── OFFICE_EXPENSES ──────────────────────────────────────────
DROP POLICY IF EXISTS "office_members_view_expenses"   ON public.office_expenses;
DROP POLICY IF EXISTS "office_members_insert_expenses" ON public.office_expenses;
DROP POLICY IF EXISTS "office_members_update_expenses" ON public.office_expenses;
DROP POLICY IF EXISTS "office_members_delete_expenses" ON public.office_expenses;
DROP POLICY IF EXISTS "admin_all_expenses"             ON public.office_expenses;

CREATE POLICY "office_members_view_expenses" ON public.office_expenses
  FOR SELECT USING (
    office_owner_id = public.get_current_office_owner_id()
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "office_members_insert_expenses" ON public.office_expenses
  FOR INSERT WITH CHECK (
    office_owner_id = public.get_current_user_id()
    OR (
      public.get_current_user_role() = 'employee'
      AND office_owner_id = public.get_current_office_owner_id()
    )
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "office_members_update_expenses" ON public.office_expenses
  FOR UPDATE USING (
    office_owner_id = public.get_current_office_owner_id()
    OR created_by = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );

CREATE POLICY "office_members_delete_expenses" ON public.office_expenses
  FOR DELETE USING (
    office_owner_id = public.get_current_user_id()
    OR created_by = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );


-- ── TEAM_MEETINGS ────────────────────────────────────────────
DROP POLICY IF EXISTS "office_members_meetings" ON public.team_meetings;
DROP POLICY IF EXISTS "admin_all_meetings"      ON public.team_meetings;

CREATE POLICY "office_members_meetings" ON public.team_meetings
  FOR ALL USING (
    office_owner_id = public.get_current_office_owner_id()
    OR public.get_current_user_role() = 'admin'
  );

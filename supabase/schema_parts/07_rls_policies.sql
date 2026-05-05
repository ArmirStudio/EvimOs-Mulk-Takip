-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 07_rls_policies.sql - RLS policies
-- ============================================================

-- BOLUM 7: RLS POLİTİKALARI
-- Son aktif politika versiyonu: Migration 21 + duzeltmeler
-- ============================================================

-- ── USERS ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_read"         ON public.users;
DROP POLICY IF EXISTS "users_insert"       ON public.users;
DROP POLICY IF EXISTS "users_update_self"  ON public.users;
DROP POLICY IF EXISTS "users_update_admin" ON public.users;

-- Kendi satiri, admin, agent (kendi olusturduklari), full employee
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

-- Sadece trigger veya backend (service_role) ekleyebilir; istemciden INSERT yok
-- INSERT policy kasitli olarak tanimlanmadi.

-- Kullanici kendi satirini guncelleyebilir
CREATE POLICY "users_update_self" ON public.users
  FOR UPDATE USING (id = public.get_current_user_id())
  WITH CHECK (id = public.get_current_user_id());

-- Admin tum kullanicilari guncelleyebilir
CREATE POLICY "users_update_admin" ON public.users
  FOR UPDATE USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');

-- Invites
DROP POLICY IF EXISTS "invites_read"   ON public.invites;
DROP POLICY IF EXISTS "invites_insert" ON public.invites;
DROP POLICY IF EXISTS "invites_update" ON public.invites;
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
-- Eski adlar (14 migration'dan)
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

-- Agent ve Employee kendi ofisini gorebilir
CREATE POLICY "users_view_own_agency" ON public.agencies
  FOR SELECT USING (
    id = (SELECT agency_id FROM public.users WHERE auth_id = auth.uid())
  );


-- ── PROPERTIES ──────────────────────────────────────────────
DROP POLICY IF EXISTS "props_read"   ON public.properties;
DROP POLICY IF EXISTS "props_write"  ON public.properties;
DROP POLICY IF EXISTS "props_update" ON public.properties;
DROP POLICY IF EXISTS "props_delete" ON public.properties;

CREATE POLICY "props_read" ON public.properties
  FOR SELECT USING (public.current_user_can_view_property(id));

CREATE POLICY "props_write" ON public.properties
  FOR INSERT WITH CHECK (
    public.get_current_user_role() = 'admin'
    OR (
      public.get_current_user_role() = 'agent'
      AND agent_id = public.get_current_user_id()
    )
    OR (
      public.get_current_user_role() = 'employee'
      AND public.is_full_employee()
      AND agent_id = public.get_current_office_owner_id()
    )
  );

CREATE POLICY "props_update" ON public.properties
  FOR UPDATE USING (public.current_user_can_manage_property(id))
  WITH CHECK (public.current_user_can_manage_property(id));

CREATE POLICY "props_delete" ON public.properties
  FOR DELETE USING (public.current_user_can_manage_property(id));


-- ── RECEIPTS ────────────────────────────────────────────────
DROP POLICY IF EXISTS "receipts_read"   ON public.receipts;
DROP POLICY IF EXISTS "receipts_insert" ON public.receipts;
DROP POLICY IF EXISTS "receipts_update" ON public.receipts;
DROP POLICY IF EXISTS "receipts_delete" ON public.receipts;

CREATE POLICY "receipts_read" ON public.receipts
  FOR SELECT USING (public.current_user_can_view_property(property_id));

CREATE POLICY "receipts_insert" ON public.receipts
  FOR INSERT WITH CHECK (public.current_user_can_view_property(property_id));

CREATE POLICY "receipts_update" ON public.receipts
  FOR UPDATE USING (public.current_user_can_view_property(property_id))
  WITH CHECK (public.current_user_can_view_property(property_id));

CREATE POLICY "receipts_delete" ON public.receipts
  FOR DELETE USING (public.current_user_can_manage_property(property_id));


-- ── RECEIPT_EVENTS ──────────────────────────────────────────
DROP POLICY IF EXISTS "receipt_events_read"   ON public.receipt_events;
DROP POLICY IF EXISTS "receipt_events_insert" ON public.receipt_events;

CREATE POLICY "receipt_events_read" ON public.receipt_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id
        AND public.current_user_can_view_property(r.property_id)
    )
  );

CREATE POLICY "receipt_events_insert" ON public.receipt_events
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.receipts r
      WHERE r.id = receipt_id
        AND public.current_user_can_view_property(r.property_id)
    )
  );


-- ── MAINTENANCE_REQUESTS ────────────────────────────────────
DROP POLICY IF EXISTS "maint_read"   ON public.maintenance_requests;
DROP POLICY IF EXISTS "maint_insert" ON public.maintenance_requests;
DROP POLICY IF EXISTS "maint_update" ON public.maintenance_requests;
DROP POLICY IF EXISTS "maint_delete" ON public.maintenance_requests;

CREATE POLICY "maint_read" ON public.maintenance_requests
  FOR SELECT USING (public.current_user_can_view_property(property_id));

CREATE POLICY "maint_insert" ON public.maintenance_requests
  FOR INSERT WITH CHECK (public.current_user_can_view_property(property_id));

CREATE POLICY "maint_update" ON public.maintenance_requests
  FOR UPDATE USING (public.current_user_can_view_property(property_id))
  WITH CHECK (public.current_user_can_view_property(property_id));

CREATE POLICY "maint_delete" ON public.maintenance_requests
  FOR DELETE USING (public.current_user_can_manage_property(property_id));


-- ── MAINTENANCE_LOGS ────────────────────────────────────────
DROP POLICY IF EXISTS "logs_read"   ON public.maintenance_logs;
DROP POLICY IF EXISTS "logs_insert" ON public.maintenance_logs;

CREATE POLICY "logs_read" ON public.maintenance_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = request_id
        AND public.current_user_can_view_property(mr.property_id)
    )
  );

CREATE POLICY "logs_insert" ON public.maintenance_logs
  FOR INSERT WITH CHECK (
    user_id = public.get_current_user_id()
    AND EXISTS (
      SELECT 1 FROM public.maintenance_requests mr
      WHERE mr.id = request_id
        AND public.current_user_can_view_property(mr.property_id)
    )
  );


-- ── NOTIFICATIONS ───────────────────────────────────────────
DROP POLICY IF EXISTS "notif_read"   ON public.notifications;
DROP POLICY IF EXISTS "notif_insert" ON public.notifications;
DROP POLICY IF EXISTS "notif_update" ON public.notifications;

-- Kullanici sadece kendi bildirimlerini okur
CREATE POLICY "notif_read" ON public.notifications
  FOR SELECT USING (
    user_id = public.get_current_user_id()
  );

-- Backend service_role bypass ile yazar; istemci katmaninda kontrol
-- TRUE = service_role harimdaki authenticated kullanicinin da yazmasina izin ver.
-- RLS bypass zaten service_role ile otomatik yapilir.
CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT WITH CHECK (TRUE);

-- Kullanici kendi bildirimini okundu isaretle
CREATE POLICY "notif_update" ON public.notifications
  FOR UPDATE USING (user_id = public.get_current_user_id());


-- ── CALENDAR_EVENTS ─────────────────────────────────────────
DROP POLICY IF EXISTS "cal_read"   ON public.calendar_events;
DROP POLICY IF EXISTS "cal_insert" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_update" ON public.calendar_events;
DROP POLICY IF EXISTS "cal_delete" ON public.calendar_events;

CREATE POLICY "cal_read" ON public.calendar_events
  FOR SELECT USING (public.current_user_can_view_property(property_id));

CREATE POLICY "cal_insert" ON public.calendar_events
  FOR INSERT WITH CHECK (public.current_user_can_manage_property(property_id));

CREATE POLICY "cal_update" ON public.calendar_events
  FOR UPDATE USING (public.current_user_can_manage_property(property_id))
  WITH CHECK (public.current_user_can_manage_property(property_id));

CREATE POLICY "cal_delete" ON public.calendar_events
  FOR DELETE USING (public.current_user_can_manage_property(property_id));


-- ── PROPERTY_DOCUMENTS ──────────────────────────────────────
DROP POLICY IF EXISTS "docs_read"   ON public.property_documents;
DROP POLICY IF EXISTS "docs_insert" ON public.property_documents;
DROP POLICY IF EXISTS "docs_update" ON public.property_documents;
DROP POLICY IF EXISTS "docs_delete" ON public.property_documents;

CREATE POLICY "docs_read" ON public.property_documents
  FOR SELECT USING (public.current_user_can_view_property(property_id));

CREATE POLICY "docs_insert" ON public.property_documents
  FOR INSERT WITH CHECK (
    uploaded_by = public.get_current_user_id()
    AND public.current_user_can_manage_property(property_id)
  );

CREATE POLICY "docs_update" ON public.property_documents
  FOR UPDATE USING (public.current_user_can_manage_property(property_id))
  WITH CHECK (public.current_user_can_manage_property(property_id));

CREATE POLICY "docs_delete" ON public.property_documents
  FOR DELETE USING (public.current_user_can_manage_property(property_id));


-- ── AD_CAMPAIGNS ────────────────────────────────────────────
DROP POLICY IF EXISTS "ads_read_active"  ON public.ad_campaigns;
DROP POLICY IF EXISTS "ads_admin_all"    ON public.ad_campaigns;

-- Herkes aktif & tarih araligindaki kampanyalari okuyabilir
CREATE POLICY "ads_read_active" ON public.ad_campaigns
  FOR SELECT USING (
    active = TRUE
    AND (start_date IS NULL OR start_date <= CURRENT_DATE)
    AND (end_date IS NULL OR end_date >= CURRENT_DATE)
  );

-- Admin tum kampanyalari yonetebilir (backend service_role ile de calisir)
CREATE POLICY "ads_admin_all" ON public.ad_campaigns
  FOR ALL USING (public.get_current_user_role() = 'admin')
  WITH CHECK (public.get_current_user_role() = 'admin');


-- ── AD_IMPRESSIONS ──────────────────────────────────────────
DROP POLICY IF EXISTS "impressions_self_read"   ON public.ad_impressions;
DROP POLICY IF EXISTS "impressions_self_insert" ON public.ad_impressions;
DROP POLICY IF EXISTS "impressions_self_update" ON public.ad_impressions;

CREATE POLICY "impressions_self_read" ON public.ad_impressions
  FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "impressions_self_insert" ON public.ad_impressions
  FOR INSERT WITH CHECK (user_id = public.get_current_user_id());

CREATE POLICY "impressions_self_update" ON public.ad_impressions
  FOR UPDATE USING (user_id = public.get_current_user_id());


-- ── TEAM_TASKS ──────────────────────────────────────────────
-- Uyari: 24_team_hub.sql'de team_tasks icin RLS tanimlanmamisti.
-- Bu eksiklik burada giderildi.
DROP POLICY IF EXISTS "team_tasks_read"   ON public.team_tasks;
DROP POLICY IF EXISTS "team_tasks_insert" ON public.team_tasks;
DROP POLICY IF EXISTS "team_tasks_update" ON public.team_tasks;
DROP POLICY IF EXISTS "team_tasks_delete" ON public.team_tasks;

-- Office sahibi ve ofis calisanlari gorevleri gorebilir
CREATE POLICY "team_tasks_read" ON public.team_tasks
  FOR SELECT USING (
    office_owner_id = public.get_current_office_owner_id()
    OR assignee_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );

-- Office sahibi veya full employee gorev olusturabilir
CREATE POLICY "team_tasks_insert" ON public.team_tasks
  FOR INSERT WITH CHECK (
    office_owner_id = public.get_current_user_id()
    OR (
      public.is_full_employee()
      AND office_owner_id = public.get_current_office_owner_id()
    )
    OR public.get_current_user_role() = 'admin'
  );

-- Gorev atananlar ve office sahibi guncelleyebilir
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

-- Sadece office sahibi silebilir
CREATE POLICY "team_tasks_delete" ON public.team_tasks
  FOR DELETE USING (
    office_owner_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );


-- ── ANNOUNCEMENTS ───────────────────────────────────────────
-- Uyari: 24_team_hub.sql'de announcements icin RLS tanimlanmamisti.
DROP POLICY IF EXISTS "announcements_read"   ON public.announcements;
DROP POLICY IF EXISTS "announcements_insert" ON public.announcements;
DROP POLICY IF EXISTS "announcements_update" ON public.announcements;
DROP POLICY IF EXISTS "announcements_delete" ON public.announcements;

-- Office sahibi/calisanlari ve admin gorebilir
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
-- Uyari: 24_team_hub.sql'de announcement_recipients icin RLS yoktu.
DROP POLICY IF EXISTS "ann_recipients_read"   ON public.announcement_recipients;
DROP POLICY IF EXISTS "ann_recipients_insert" ON public.announcement_recipients;
DROP POLICY IF EXISTS "ann_recipients_update" ON public.announcement_recipients;

-- Alici kendi kaydini gorebilir; office sahibi/admin hepsini
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

-- Backend/service_role ekleyebilir (TRUE with check)
CREATE POLICY "ann_recipients_insert" ON public.announcement_recipients
  FOR INSERT WITH CHECK (TRUE);

-- Kullanici kendi okuma durumunu guncelleyebilir
CREATE POLICY "ann_recipients_update" ON public.announcement_recipients
  FOR UPDATE USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());


-- ── OFFICE_CONTACTS (Teknikçi Rehberi) ──────────────────────
DROP POLICY IF EXISTS "office_contacts_agent_read" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_employee_read" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_tenant_read" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_insert" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_update" ON public.office_contacts;
DROP POLICY IF EXISTS "office_contacts_delete" ON public.office_contacts;

-- Agent: Kendi ofisin tüm kontaktları (aktif + silinmiş)
CREATE POLICY "office_contacts_agent_read" ON public.office_contacts
  FOR SELECT USING (
    office_id = public.get_current_office_owner_id()
    AND public.get_current_user_role() = 'agent'
  );

-- Employee: Kendi ofisin aktif kontaktları (full access only)
CREATE POLICY "office_contacts_employee_read" ON public.office_contacts
  FOR SELECT USING (
    office_id = public.get_current_office_owner_id()
    AND public.get_current_user_role() = 'employee'
    AND deleted_at IS NULL
  );

-- Tenant/Landlord: Aktif kontaktları görür (maintenance ile ilgili oldukları için)
CREATE POLICY "office_contacts_tenant_read" ON public.office_contacts
  FOR SELECT USING (
    deleted_at IS NULL
    AND office_id IN (
      SELECT u.agency_id FROM public.users u
      WHERE u.id = public.get_current_user_id()
        AND u.agency_id IS NOT NULL
      UNION
      SELECT DISTINCT p.agent_id
      FROM public.properties p
      WHERE (p.tenant_id = public.get_current_user_id() OR p.landlord_id = public.get_current_user_id())
    )
  );

-- Insert: Agent + Full Employee
CREATE POLICY "office_contacts_insert" ON public.office_contacts
  FOR INSERT WITH CHECK (
    office_id = public.get_current_office_owner_id()
    AND (
      public.get_current_user_role() = 'agent'
      OR (
        public.get_current_user_role() = 'employee'
        AND public.is_full_employee()
      )
    )
  );

-- Update: Creator + Agent
CREATE POLICY "office_contacts_update" ON public.office_contacts
  FOR UPDATE USING (
    office_id = public.get_current_office_owner_id()
    AND (
      created_by = public.get_current_user_id()
      OR public.get_current_user_role() = 'agent'
    )
  );

-- Delete (soft): Creator + Agent
CREATE POLICY "office_contacts_delete" ON public.office_contacts
  FOR UPDATE USING (
    office_id = public.get_current_office_owner_id()
    AND (
      created_by = public.get_current_user_id()
      OR public.get_current_user_role() = 'agent'
    )
  );

-- ── PROFESSIONS (Meslekler) ────────────────────
DROP POLICY IF EXISTS "professions_read" ON public.professions;

-- Herkes tüm meslekleri okuyabilir (dropdown için)
CREATE POLICY "professions_read" ON public.professions
  FOR SELECT USING (TRUE);


-- ── CONTACT_NICKNAMES (Özel Takma Adlar) ────────────────────
DROP POLICY IF EXISTS "contact_nicknames_read" ON public.contact_nicknames;
DROP POLICY IF EXISTS "contact_nicknames_write" ON public.contact_nicknames;

-- Sadece kendi nickname'larını görür
CREATE POLICY "contact_nicknames_read" ON public.contact_nicknames
  FOR SELECT USING (user_id = public.get_current_user_id());

-- Sadece kendi nickname'larını yönetir
CREATE POLICY "contact_nicknames_write" ON public.contact_nicknames
  FOR ALL USING (user_id = public.get_current_user_id())
  WITH CHECK (user_id = public.get_current_user_id());


-- ── TEAM_MESSAGES (Office Chat) ────────────────────────────
DROP POLICY IF EXISTS "team_messages_read" ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_insert" ON public.team_messages;
DROP POLICY IF EXISTS "team_messages_delete" ON public.team_messages;

-- Kendi ofisinin mesajlarını oku
CREATE POLICY "team_messages_read" ON public.team_messages
  FOR SELECT USING (
    office_id IN (
      SELECT agency_id FROM public.users WHERE id = public.get_current_user_id()
    )
    OR public.get_current_user_role() = 'admin'
  );

-- Sadece kendi ofisine mesaj gönder
CREATE POLICY "team_messages_insert" ON public.team_messages
  FOR INSERT WITH CHECK (
    sender_id = public.get_current_user_id()
    AND office_id IN (
      SELECT agency_id FROM public.users WHERE id = public.get_current_user_id()
    )
  );

-- Kendi mesajlarını veya admin olarak hepsini sil
CREATE POLICY "team_messages_delete" ON public.team_messages
  FOR DELETE USING (
    sender_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );


-- ============================================================

-- ============================================================
-- Run order: 07b — RLS policies: Property & Financial
-- Tablolar: properties, receipts, receipt_events,
--           maintenance_requests, maintenance_logs,
--           notifications, calendar_events, property_documents
-- ============================================================

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

CREATE POLICY "notif_read" ON public.notifications
  FOR SELECT USING (user_id = public.get_current_user_id());

CREATE POLICY "notif_insert" ON public.notifications
  FOR INSERT WITH CHECK (
    user_id = public.get_current_user_id()
    OR public.get_current_user_role() = 'admin'
  );

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

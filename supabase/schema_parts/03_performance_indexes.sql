-- ============================================================
-- Extracted from supabase/00_MASTER_SCHEMA.sql
-- Run order: 03_performance_indexes.sql - Performance indexes
-- ============================================================

-- BOLUM 3: PERFORMANS INDEX'LERİ
-- ============================================================

-- users
CREATE INDEX IF NOT EXISTS idx_users_auth_id        ON public.users(auth_id);
CREATE INDEX IF NOT EXISTS idx_users_role           ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status         ON public.users(status);
CREATE INDEX IF NOT EXISTS idx_users_agency_id      ON public.users(agency_id);
CREATE INDEX IF NOT EXISTS idx_users_created_by     ON public.users(created_by);
CREATE INDEX IF NOT EXISTS idx_users_invited_via    ON public.users(invited_via_invite_id);

-- invites
CREATE INDEX IF NOT EXISTS idx_invites_office_status
  ON public.invites(office_owner_id, used_at, revoked_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_invites_created_by
  ON public.invites(created_by);
CREATE UNIQUE INDEX IF NOT EXISTS idx_invites_code_hash
  ON public.invites(code_hash)
  WHERE code_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_invite_events_invite
  ON public.invite_events(invite_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_invite_events_target
  ON public.invite_events(target_user_id, created_at DESC);

-- properties
CREATE INDEX IF NOT EXISTS idx_properties_agent_id    ON public.properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_landlord_id ON public.properties(landlord_id);
CREATE INDEX IF NOT EXISTS idx_properties_tenant_id   ON public.properties(tenant_id);
CREATE INDEX IF NOT EXISTS idx_properties_employee_id ON public.properties(employee_id);
CREATE INDEX IF NOT EXISTS idx_properties_status      ON public.properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_city        ON public.properties(city);
CREATE INDEX IF NOT EXISTS idx_properties_is_furnished
  ON public.properties(is_furnished)
  WHERE is_furnished IS NOT NULL;

-- receipts
CREATE INDEX IF NOT EXISTS idx_receipts_property_id   ON public.receipts(property_id);
CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_by   ON public.receipts(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_receipts_status        ON public.receipts(status);
CREATE INDEX IF NOT EXISTS idx_receipts_month         ON public.receipts(month);
CREATE INDEX IF NOT EXISTS idx_receipts_created_at    ON public.receipts(created_at DESC);

-- maintenance_requests
CREATE INDEX IF NOT EXISTS idx_maint_property_id   ON public.maintenance_requests(property_id);
CREATE INDEX IF NOT EXISTS idx_maint_created_by    ON public.maintenance_requests(created_by);
CREATE INDEX IF NOT EXISTS idx_maint_status        ON public.maintenance_requests(status);
CREATE INDEX IF NOT EXISTS idx_maint_created_at    ON public.maintenance_requests(created_at DESC);

-- notifications
CREATE INDEX IF NOT EXISTS idx_notif_user   ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notif_unread ON public.notifications(user_id, read);

-- calendar_events
CREATE INDEX IF NOT EXISTS idx_cal_property_id ON public.calendar_events(property_id);
CREATE INDEX IF NOT EXISTS idx_cal_event_date  ON public.calendar_events(event_date);

-- receipt_events
CREATE INDEX IF NOT EXISTS idx_receipt_events_receipt_id_created_at
  ON public.receipt_events(receipt_id, created_at DESC);

-- maintenance_logs
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_request_id
  ON public.maintenance_logs(request_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_logs_created_at
  ON public.maintenance_logs(created_at DESC);

-- ad_campaigns
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_type        ON public.ad_campaigns(type);
CREATE INDEX IF NOT EXISTS idx_ad_campaigns_active      ON public.ad_campaigns(active, start_date, end_date);

-- ad_impressions
CREATE INDEX IF NOT EXISTS idx_ad_impressions_user_date ON public.ad_impressions(user_id, shown_date);

-- team_tasks
CREATE INDEX IF NOT EXISTS idx_team_tasks_office_scheduled
  ON public.team_tasks(office_owner_id, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_team_tasks_assignee_status
  ON public.team_tasks(assignee_id, status, scheduled_at ASC);
CREATE INDEX IF NOT EXISTS idx_team_tasks_type_completed
  ON public.team_tasks(task_type, completed_at DESC);

-- announcements
CREATE INDEX IF NOT EXISTS idx_announcements_office_created
  ON public.announcements(office_owner_id, created_at DESC);

-- announcement_recipients
CREATE INDEX IF NOT EXISTS idx_announcement_recipients_user_read
  ON public.announcement_recipients(user_id, read_at, reminded_at);

-- team_messages
CREATE INDEX IF NOT EXISTS idx_team_messages_office_created
  ON public.team_messages(office_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_team_messages_sender_created
  ON public.team_messages(sender_id, created_at DESC);


-- ============================================================

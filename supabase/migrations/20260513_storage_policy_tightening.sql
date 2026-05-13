-- Tighten private storage buckets and remove bucket-wide authenticated access.

INSERT INTO storage.buckets (id, name, public)
VALUES ('tenant-documents', 'tenant-documents', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('task-photos', 'task-photos', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

INSERT INTO storage.buckets (id, name, public)
VALUES ('announcement-files', 'announcement-files', FALSE)
ON CONFLICT (id) DO UPDATE SET public = FALSE;

DROP POLICY IF EXISTS "tenant_documents_read" ON storage.objects;
DROP POLICY IF EXISTS "tenant_documents_write" ON storage.objects;
DROP POLICY IF EXISTS "receipts_private_read" ON storage.objects;
DROP POLICY IF EXISTS "receipts_private_write" ON storage.objects;
DROP POLICY IF EXISTS "receipts_private_update" ON storage.objects;
DROP POLICY IF EXISTS "receipts_private_delete" ON storage.objects;
DROP POLICY IF EXISTS "property_documents_read" ON storage.objects;
DROP POLICY IF EXISTS "property_documents_write" ON storage.objects;
DROP POLICY IF EXISTS "property_documents_update" ON storage.objects;
DROP POLICY IF EXISTS "property_documents_delete" ON storage.objects;
DROP POLICY IF EXISTS "maintenance_photos_read" ON storage.objects;
DROP POLICY IF EXISTS "maintenance_photos_write" ON storage.objects;
DROP POLICY IF EXISTS "team_public_files_read" ON storage.objects;
DROP POLICY IF EXISTS "team_public_files_insert" ON storage.objects;
DROP POLICY IF EXISTS "team_public_files_update" ON storage.objects;
DROP POLICY IF EXISTS "team_public_files_delete" ON storage.objects;
DROP POLICY IF EXISTS "task_photos_read" ON storage.objects;
DROP POLICY IF EXISTS "task_photos_write" ON storage.objects;
DROP POLICY IF EXISTS "task_photos_update" ON storage.objects;
DROP POLICY IF EXISTS "task_photos_delete" ON storage.objects;
DROP POLICY IF EXISTS "announcement_files_read" ON storage.objects;
DROP POLICY IF EXISTS "announcement_files_write" ON storage.objects;
DROP POLICY IF EXISTS "announcement_files_update" ON storage.objects;
DROP POLICY IF EXISTS "announcement_files_delete" ON storage.objects;

CREATE POLICY "tenant_documents_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'tenant-documents'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_view_property(p.id)
    )
  );

CREATE POLICY "tenant_documents_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'tenant-documents'
    AND (storage.foldername(name))[2] = public.get_current_user_id()::text
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_manage_property(p.id)
    )
  );

CREATE POLICY "receipts_private_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'receipts'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_view_property(p.id)
    )
  );

CREATE POLICY "receipts_private_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'receipts'
    AND (storage.foldername(name))[2] = public.get_current_user_id()::text
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND (
          public.get_current_user_role() = 'admin'
          OR p.tenant_id = public.get_current_user_id()
        )
    )
  );

CREATE POLICY "receipts_private_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (
      public.get_current_user_role() = 'admin'
      OR (storage.foldername(name))[2] = public.get_current_user_id()::text
    )
  )
  WITH CHECK (
    bucket_id = 'receipts'
    AND (
      public.get_current_user_role() = 'admin'
      OR (storage.foldername(name))[2] = public.get_current_user_id()::text
    )
  );

CREATE POLICY "receipts_private_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'receipts'
    AND (
      public.get_current_user_role() = 'admin'
      OR (storage.foldername(name))[2] = public.get_current_user_id()::text
    )
  );

CREATE POLICY "property_documents_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_view_property(p.id)
    )
  );

CREATE POLICY "property_documents_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-documents'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_manage_property(p.id)
    )
  );

CREATE POLICY "property_documents_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_manage_property(p.id)
    )
  )
  WITH CHECK (
    bucket_id = 'property-documents'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_manage_property(p.id)
    )
  );

CREATE POLICY "property_documents_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'property-documents'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_manage_property(p.id)
    )
  );

CREATE POLICY "maintenance_photos_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'maintenance-photos'
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_view_property(p.id)
    )
  );

CREATE POLICY "maintenance_photos_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-photos'
    AND (storage.foldername(name))[2] = public.get_current_user_id()::text
    AND EXISTS (
      SELECT 1 FROM public.properties p
      WHERE p.id::text = (storage.foldername(name))[1]
        AND public.current_user_can_view_property(p.id)
    )
  );

CREATE POLICY "task_photos_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'task-photos'
    AND EXISTS (
      SELECT 1 FROM public.team_tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (
          t.office_owner_id = public.get_current_office_owner_id()
          OR t.assignee_id = public.get_current_user_id()
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

CREATE POLICY "task_photos_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'task-photos'
    AND EXISTS (
      SELECT 1 FROM public.team_tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (
          t.office_owner_id = public.get_current_office_owner_id()
          OR t.assignee_id = public.get_current_user_id()
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

CREATE POLICY "task_photos_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'task-photos'
    AND EXISTS (
      SELECT 1 FROM public.team_tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (
          t.office_owner_id = public.get_current_office_owner_id()
          OR t.assignee_id = public.get_current_user_id()
          OR public.get_current_user_role() = 'admin'
        )
    )
  )
  WITH CHECK (
    bucket_id = 'task-photos'
    AND EXISTS (
      SELECT 1 FROM public.team_tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (
          t.office_owner_id = public.get_current_office_owner_id()
          OR t.assignee_id = public.get_current_user_id()
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

CREATE POLICY "task_photos_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'task-photos'
    AND EXISTS (
      SELECT 1 FROM public.team_tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND (
          t.office_owner_id = public.get_current_office_owner_id()
          OR t.assignee_id = public.get_current_user_id()
          OR public.get_current_user_role() = 'admin'
        )
    )
  );

CREATE POLICY "announcement_files_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'announcement-files'
    AND (
      EXISTS (
        SELECT 1 FROM public.announcements a
        WHERE a.attachment_path = name
          AND a.office_owner_id = public.get_current_office_owner_id()
      )
      OR (storage.foldername(name))[1] = public.get_current_office_owner_id()::text
      OR public.get_current_user_role() = 'admin'
    )
  );

CREATE POLICY "announcement_files_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'announcement-files'
    AND (storage.foldername(name))[1] = public.get_current_office_owner_id()::text
    AND (storage.foldername(name))[2] = public.get_current_user_id()::text
  );

CREATE POLICY "announcement_files_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'announcement-files'
    AND (storage.foldername(name))[1] = public.get_current_office_owner_id()::text
    AND (storage.foldername(name))[2] = public.get_current_user_id()::text
  )
  WITH CHECK (
    bucket_id = 'announcement-files'
    AND (storage.foldername(name))[1] = public.get_current_office_owner_id()::text
    AND (storage.foldername(name))[2] = public.get_current_user_id()::text
  );

CREATE POLICY "announcement_files_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'announcement-files'
    AND (storage.foldername(name))[1] = public.get_current_office_owner_id()::text
    AND (storage.foldername(name))[2] = public.get_current_user_id()::text
  );

-- ============================================================
-- Run order: 10a — Storage policies: Public buckets
-- Bucket'lar: avatars, agency-branding, ad-media, property-images
-- Bu bucket'lar herkese açık okuma, authenticated write.
-- ============================================================

-- ── AVATARS ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "avatars_public_read"        ON storage.objects;
DROP POLICY IF EXISTS "avatars_authenticated_write" ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_authenticated_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── AGENCY_BRANDING ──────────────────────────────────────────
DROP POLICY IF EXISTS "agency_branding_read"  ON storage.objects;
DROP POLICY IF EXISTS "agency_branding_write" ON storage.objects;

CREATE POLICY "agency_branding_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'agency-branding');

CREATE POLICY "agency_branding_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'agency-branding'
    AND auth.uid() IS NOT NULL
  );

-- ── AD_MEDIA ─────────────────────────────────────────────────
DROP POLICY IF EXISTS "ad_media_read"        ON storage.objects;
DROP POLICY IF EXISTS "ad_media_admin_write" ON storage.objects;

CREATE POLICY "ad_media_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'ad-media');

CREATE POLICY "ad_media_admin_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ad-media'
    AND auth.uid() IS NOT NULL
  );

-- ── PROPERTY_IMAGES ──────────────────────────────────────────
DROP POLICY IF EXISTS "property_images_read"  ON storage.objects;
DROP POLICY IF EXISTS "property_images_write" ON storage.objects;

CREATE POLICY "property_images_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'property-images');

CREATE POLICY "property_images_write" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'property-images'
    AND auth.uid() IS NOT NULL
  );

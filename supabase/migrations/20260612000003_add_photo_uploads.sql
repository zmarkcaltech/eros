-- Migration: Add photo upload capabilities
-- Description: Add profile pictures and relationship photos
-- Date: 2026-06-12

-- ============================================================================
-- 1. ADD AVATAR_URL TO PROFILES TABLE
-- ============================================================================

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN profiles.avatar_url IS 'URL to user profile picture in Supabase Storage';

-- ============================================================================
-- 2. CREATE RELATIONSHIP_PHOTOS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS relationship_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption TEXT,
  uploaded_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_relationship_photos_relationship ON relationship_photos(relationship_id, created_at DESC);
CREATE INDEX idx_relationship_photos_uploader ON relationship_photos(uploaded_by);

COMMENT ON TABLE relationship_photos IS 'Photos of couples together';

-- ============================================================================
-- 3. ROW LEVEL SECURITY FOR RELATIONSHIP_PHOTOS
-- ============================================================================

ALTER TABLE relationship_photos ENABLE ROW LEVEL SECURITY;

-- Partners can view photos in their relationship
CREATE POLICY "Partners can view relationship photos"
  ON relationship_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- Partners can upload photos to their relationship
CREATE POLICY "Partners can upload relationship photos"
  ON relationship_photos FOR INSERT
  WITH CHECK (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
        AND r.status = 'active'
    )
  );

-- Partners can delete their own uploaded photos
CREATE POLICY "Partners can delete own photos"
  ON relationship_photos FOR DELETE
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- Partners can update their own photos (caption only)
CREATE POLICY "Partners can update own photos"
  ON relationship_photos FOR UPDATE
  USING (
    uploaded_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  )
  WITH CHECK (
    uploaded_by = auth.uid()
  );

-- ============================================================================
-- 4. ENABLE REALTIME FOR RELATIONSHIP_PHOTOS
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE relationship_photos;

-- ============================================================================
-- 5. STORAGE BUCKETS (Manual setup required in Supabase dashboard)
-- ============================================================================

-- MANUAL STEPS REQUIRED IN SUPABASE DASHBOARD:
--
-- 1. Create storage bucket: 'avatars'
--    - Public: Yes
--    - File size limit: 5MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--
-- 2. Create storage bucket: 'relationship-photos'
--    - Public: Yes
--    - File size limit: 10MB
--    - Allowed MIME types: image/jpeg, image/png, image/webp, image/gif
--
-- 3. Add storage policies (see below for SQL)

-- Storage policies for avatars bucket:
--
-- CREATE POLICY "Users can upload their own avatar"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'avatars'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- CREATE POLICY "Users can update their own avatar"
--   ON storage.objects FOR UPDATE
--   USING (
--     bucket_id = 'avatars'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- CREATE POLICY "Users can delete their own avatar"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'avatars'
--     AND auth.uid()::text = (storage.foldername(name))[1]
--   );
--
-- CREATE POLICY "Anyone can view avatars"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'avatars');

-- Storage policies for relationship-photos bucket:
--
-- CREATE POLICY "Partners can upload relationship photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (
--     bucket_id = 'relationship-photos'
--     AND EXISTS (
--       SELECT 1 FROM relationships r
--       WHERE r.id::text = (storage.foldername(name))[1]
--         AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
--         AND r.status = 'active'
--     )
--   );
--
-- CREATE POLICY "Partners can delete relationship photos"
--   ON storage.objects FOR DELETE
--   USING (
--     bucket_id = 'relationship-photos'
--     AND EXISTS (
--       SELECT 1 FROM relationships r
--       WHERE r.id::text = (storage.foldername(name))[1]
--         AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
--     )
--   );
--
-- CREATE POLICY "Anyone can view relationship photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'relationship-photos');

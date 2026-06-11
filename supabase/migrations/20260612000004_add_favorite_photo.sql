-- Migration: Add favorite photo feature
-- Description: Allow couples to mark one photo as their favorite to display on dashboard
-- Date: 2026-06-12

-- Add is_favorite column to relationship_photos
ALTER TABLE relationship_photos ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Add index for quick lookup of favorite photo
CREATE INDEX IF NOT EXISTS idx_relationship_photos_favorite ON relationship_photos(relationship_id, is_favorite) WHERE is_favorite = true;

-- Add constraint: only one favorite photo per relationship
-- This is enforced via a unique partial index
CREATE UNIQUE INDEX IF NOT EXISTS unique_favorite_per_relationship
  ON relationship_photos(relationship_id)
  WHERE is_favorite = true;

COMMENT ON COLUMN relationship_photos.is_favorite IS 'Only one photo per relationship can be marked as favorite for dashboard display';

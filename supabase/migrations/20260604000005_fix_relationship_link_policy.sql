-- ============================================
-- FIX RELATIONSHIP LINK RLS POLICY
-- ============================================
-- Allow users to read relationships by link_code even if they're not a partner yet
-- This is needed so Partner B can find the relationship to join it

-- Add policy to allow reading relationships by link_code
CREATE POLICY "Users can view relationships by link code"
  ON relationships FOR SELECT
  USING (
    link_code IS NOT NULL
    AND status = 'pending'
  );

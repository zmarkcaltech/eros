-- Migration: Update love_map_rounds RLS policies for territory-based system
-- Description: Support both session-based (legacy) and territory-based rounds
-- Date: 2026-06-12

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Partners can view rounds" ON love_map_rounds;
DROP POLICY IF EXISTS "Partners can create rounds" ON love_map_rounds;
DROP POLICY IF EXISTS "Partners can update rounds" ON love_map_rounds;

-- New policy: Partners can view rounds (supports both systems)
CREATE POLICY "Partners can view rounds"
  ON love_map_rounds FOR SELECT
  USING (
    -- Session-based rounds (legacy)
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM love_map_sessions s
      JOIN relationships r ON r.id = s.relationship_id
      WHERE s.id = session_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    ))
    OR
    -- Territory-based rounds (new system)
    (relationship_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    ))
  );

-- New policy: Partners can create rounds (supports both systems)
CREATE POLICY "Partners can create rounds"
  ON love_map_rounds FOR INSERT
  WITH CHECK (
    -- Session-based rounds (legacy)
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM love_map_sessions s
      JOIN relationships r ON r.id = s.relationship_id
      WHERE s.id = session_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    ))
    OR
    -- Territory-based rounds (new system)
    (relationship_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
        AND r.status = 'active'
    ))
  );

-- New policy: Partners can update rounds (supports both systems)
CREATE POLICY "Partners can update rounds"
  ON love_map_rounds FOR UPDATE
  USING (
    -- Session-based rounds (legacy)
    (session_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM love_map_sessions s
      JOIN relationships r ON r.id = s.relationship_id
      WHERE s.id = session_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    ))
    OR
    -- Territory-based rounds (new system)
    (relationship_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    ))
  );

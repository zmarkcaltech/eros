-- Migration: MapQuest Territory Conquest System
-- Description: Transform from mode-based sessions to persistent map conquest game
-- Date: 2026-06-12

-- ============================================================================
-- 1. CREATE MAP_TERRITORIES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS map_territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL UNIQUE,
  category TEXT NOT NULL,
  depth_filter TEXT,
  points_to_capture INTEGER NOT NULL,
  visual_theme JSONB NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Seed 12 territories with fantasy theme
INSERT INTO map_territories (name, display_order, category, depth_filter, points_to_capture, visual_theme, description) VALUES
('Daily Rituals', 1, 'daily_life', 'light', 15,
  '{"color": "#FCD34D", "icon": "☕", "gradient": ["#FEF3C7", "#FCD34D"]}'::jsonb,
  'Master the little moments that make up your shared life'),

('Morning & Evening', 2, 'daily_life', 'medium', 20,
  '{"color": "#F59E0B", "icon": "🌅", "gradient": ["#FEF3C7", "#F59E0B"]}'::jsonb,
  'Understand how you each start and end the day'),

('Stress Mountains', 3, 'stress_support', 'medium', 25,
  '{"color": "#3B82F6", "icon": "⛰️", "gradient": ["#DBEAFE", "#3B82F6"]}'::jsonb,
  'Navigate the peaks and valleys of daily pressures together'),

('Support Valley', 4, 'stress_support', NULL, 30,
  '{"color": "#10B981", "icon": "🏞️", "gradient": ["#D1FAE5", "#10B981"]}'::jsonb,
  'Learn to be each other''s safe haven in difficult times'),

('Romance Ridge', 5, 'affection_romance', 'medium', 20,
  '{"color": "#EC4899", "icon": "🌹", "gradient": ["#FCE7F3", "#EC4899"]}'::jsonb,
  'Explore the landscape of love, desire, and affection'),

('Intimacy Isle', 6, 'affection_romance', 'deep', 35,
  '{"color": "#A855F7", "icon": "🏝️", "gradient": ["#F3E8FF", "#A855F7"]}'::jsonb,
  'Discover the deepest waters of emotional and physical connection'),

('Memory Lane', 7, 'history', NULL, 25,
  '{"color": "#92400E", "icon": "🛤️", "gradient": ["#FEF3C7", "#92400E"]}'::jsonb,
  'Walk the path of shared experiences and formative moments'),

('Dream Plains', 8, 'dreams_identity', 'medium', 20,
  '{"color": "#8B5CF6", "icon": "🌾", "gradient": ["#EDE9FE", "#8B5CF6"]}'::jsonb,
  'Wander through fields of hopes, aspirations, and future visions'),

('Identity Peaks', 9, 'dreams_identity', 'deep', 35,
  '{"color": "#6366F1", "icon": "⛰️", "gradient": ["#E0E7FF", "#6366F1"]}'::jsonb,
  'Climb to the heights of self-understanding and personal growth'),

('Conflict Canyon', 10, 'conflict_repair', 'medium', 30,
  '{"color": "#EF4444", "icon": "🏜️", "gradient": ["#FEE2E2", "#EF4444"]}'::jsonb,
  'Traverse the rocky terrain of disagreement with care and curiosity'),

('Repair Harbor', 11, 'conflict_repair', 'deep', 40,
  '{"color": "#14B8A6", "icon": "⚓", "gradient": ["#CCFBF1", "#14B8A6"]}'::jsonb,
  'Find the safe port where healing and reconnection happen'),

('Humor Hills', 12, 'play_humor', 'light', 15,
  '{"color": "#F59E0B", "icon": "🎭", "gradient": ["#FEF3C7", "#F59E0B"]}'::jsonb,
  'Frolic through the playful, quirky, and delightfully weird parts of life');

CREATE INDEX idx_territories_order ON map_territories(display_order);
CREATE INDEX idx_territories_category ON map_territories(category);

-- ============================================================================
-- 2. CREATE RELATIONSHIP_TERRITORY_PROGRESS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS relationship_territory_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES map_territories(id) ON DELETE CASCADE,

  -- Progress tracking
  total_points INTEGER DEFAULT 0,
  questions_answered INTEGER DEFAULT 0,
  status TEXT DEFAULT 'available' CHECK (status IN ('locked', 'available', 'in_progress', 'captured')),

  -- Rewards
  captured_at TIMESTAMPTZ,
  ai_insight TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(relationship_id, territory_id)
);

CREATE INDEX idx_territory_progress_relationship ON relationship_territory_progress(relationship_id);
CREATE INDEX idx_territory_progress_status ON relationship_territory_progress(relationship_id, status);

-- Enable RLS
ALTER TABLE relationship_territory_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view territory progress"
  ON relationship_territory_progress FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Partners can update territory progress"
  ON relationship_territory_progress FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "System can insert territory progress"
  ON relationship_territory_progress FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- ============================================================================
-- 3. CREATE RELATIONSHIP_CHAT_MESSAGES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS relationship_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('partner_a', 'partner_b')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_relationship_chat ON relationship_chat_messages(relationship_id, created_at DESC);

-- Enable RLS
ALTER TABLE relationship_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Partners can view relationship chat"
  ON relationship_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Partners can send messages"
  ON relationship_chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
        AND r.status = 'active'
    )
  );

-- ============================================================================
-- 4. MODIFY LOVE_MAP_ROUNDS TABLE
-- ============================================================================

-- Add new columns for territory-based system
ALTER TABLE love_map_rounds
  ADD COLUMN IF NOT EXISTS relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS territory_id UUID REFERENCES map_territories(id);

-- Make session_id nullable (for backward compatibility)
ALTER TABLE love_map_rounds ALTER COLUMN session_id DROP NOT NULL;

-- Make round_number nullable (no longer sequential per territory)
ALTER TABLE love_map_rounds ALTER COLUMN round_number DROP NOT NULL;

-- Create new indexes for territory-based queries
CREATE INDEX IF NOT EXISTS idx_rounds_relationship_territory ON love_map_rounds(relationship_id, territory_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rounds_territory_status ON love_map_rounds(territory_id, status);
CREATE INDEX IF NOT EXISTS idx_rounds_relationship_status ON love_map_rounds(relationship_id, status);

-- ============================================================================
-- 5. MARK OLD SESSIONS AS LEGACY
-- ============================================================================

ALTER TABLE love_map_sessions
  ADD COLUMN IF NOT EXISTS is_legacy BOOLEAN DEFAULT true;

-- ============================================================================
-- 6. ENABLE REALTIME ON NEW TABLES
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE map_territories;
ALTER PUBLICATION supabase_realtime ADD TABLE relationship_territory_progress;
ALTER PUBLICATION supabase_realtime ADD TABLE relationship_chat_messages;

-- ============================================================================
-- 7. MAKE TABLES PUBLIC READABLE WHERE APPROPRIATE
-- ============================================================================

-- Anyone can view territories (public game data)
ALTER TABLE map_territories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view territories"
  ON map_territories FOR SELECT
  USING (true);

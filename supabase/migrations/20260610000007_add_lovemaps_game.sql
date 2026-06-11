-- Migration: Add Love Maps Game Tables
-- Description: Create tables for MapQuest for Couples game
-- Date: 2026-06-10

-- Question bank
CREATE TABLE IF NOT EXISTS love_map_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN (
    'daily_life',
    'stress_support',
    'affection_romance',
    'history',
    'dreams_identity',
    'conflict_repair',
    'play_humor',
    'patch_notes'
  )),
  depth TEXT NOT NULL CHECK (depth IN ('light', 'medium', 'deep')),
  prompt TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Game sessions
CREATE TABLE IF NOT EXISTS love_map_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  mode TEXT NOT NULL CHECK (mode IN ('daily', 'date_night', 'repair', 'patch_notes')),
  depth TEXT NOT NULL CHECK (depth IN ('light', 'medium', 'deep')),
  status TEXT NOT NULL DEFAULT 'in_progress' CHECK (status IN ('waiting', 'in_progress', 'completed', 'paused')),
  current_round INTEGER DEFAULT 1,
  total_rounds INTEGER NOT NULL,
  current_answerer TEXT CHECK (current_answerer IN ('partner_a', 'partner_b')),
  map_points INTEGER DEFAULT 0,
  discovery_points INTEGER DEFAULT 0,
  care_coins INTEGER DEFAULT 0,
  learned_items TEXT[] DEFAULT '{}',
  tiny_action TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Game rounds
CREATE TABLE IF NOT EXISTS love_map_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES love_map_sessions(id) ON DELETE CASCADE,
  round_number INTEGER NOT NULL,
  question_id UUID NOT NULL REFERENCES love_map_questions(id),
  answering_partner TEXT NOT NULL CHECK (answering_partner IN ('partner_a', 'partner_b')),
  private_answer TEXT,
  guess TEXT,
  closeness_rating TEXT CHECK (closeness_rating IN (
    'nailed_it',
    'pretty_close',
    'partly_right',
    'new_discovery',
    'want_to_explain'
  )),
  clarification TEXT,
  reflection TEXT,
  care_coin_awarded BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'awaiting_answer' CHECK (status IN (
    'awaiting_answer',
    'awaiting_guess',
    'awaiting_rating',
    'awaiting_reflection',
    'completed',
    'skipped'
  )),
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sessions_relationship ON love_map_sessions(relationship_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON love_map_sessions(status);
CREATE INDEX IF NOT EXISTS idx_rounds_session ON love_map_rounds(session_id, round_number);
CREATE INDEX IF NOT EXISTS idx_questions_category_depth ON love_map_questions(category, depth);

-- Enable Row Level Security
ALTER TABLE love_map_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE love_map_rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE love_map_questions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for love_map_sessions
CREATE POLICY "Partners can view sessions"
  ON love_map_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Partners can create sessions"
  ON love_map_sessions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
        AND r.status = 'active'
    )
  );

CREATE POLICY "Partners can update sessions"
  ON love_map_sessions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- RLS Policies for love_map_rounds
CREATE POLICY "Partners can view rounds"
  ON love_map_rounds FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM love_map_sessions s
      JOIN relationships r ON r.id = s.relationship_id
      WHERE s.id = session_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Partners can create rounds"
  ON love_map_rounds FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM love_map_sessions s
      JOIN relationships r ON r.id = s.relationship_id
      WHERE s.id = session_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Partners can update rounds"
  ON love_map_rounds FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM love_map_sessions s
      JOIN relationships r ON r.id = s.relationship_id
      WHERE s.id = session_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- RLS Policy for love_map_questions (public read-only)
CREATE POLICY "Anyone can view questions"
  ON love_map_questions FOR SELECT
  USING (true);

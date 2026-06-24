-- Migration: Mediation System - Personalized Conflict Resolution
-- Description: Implements guided mediation with solo conversations, safety evaluation,
--              and personalized recommendations based on user preferences and history.
-- Date: 2026-06-23

-- ============================================================================
-- STEP 1: Update existing tables
-- ============================================================================

-- Add conflict resolution preferences to profiles (from onboarding)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS conflict_resolution_preferences TEXT[] DEFAULT '{}';

COMMENT ON COLUMN profiles.conflict_resolution_preferences IS
  'User preferences for resolving conflicts, collected during onboarding.
   Options: talk_right_away, cool_down_first, need_space, process_alone_first, write_first, sleep_on_it';

-- ============================================================================
-- STEP 2: Create conflict_incidents table
-- ============================================================================

CREATE TABLE IF NOT EXISTS conflict_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,

  -- Initiation
  initiated_by UUID NOT NULL REFERENCES profiles(id),
  initiated_at TIMESTAMPTZ DEFAULT now(),

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'awaiting_partner_intake'
    CHECK (status IN (
      'awaiting_partner_intake',    -- Partner A done, waiting for Partner B
      'safety_evaluation',           -- Both done, Eros evaluating
      'recommend_professional_help', -- Eros flagged as high-risk
      'recommend_break',             -- Eros suggests cooling off
      'solo_conversations',          -- Eros suggests more individual processing
      'joint_mediation_ready',       -- Ready for 3-way chat
      'in_joint_mediation',          -- Active 3-way conversation
      'resolved',                    -- Marked as resolved
      'abandoned'                    -- Users stopped engaging
    )),

  -- Topic & context
  topic TEXT,                        -- User-described topic (e.g., "finances", "chores")
  topic_category TEXT,               -- AI-classified category for pattern analysis

  -- Timeline
  partner_a_intake_completed_at TIMESTAMPTZ,
  partner_b_intake_completed_at TIMESTAMPTZ,
  joint_mediation_started_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,

  -- Outcome tracking
  resolution_outcome TEXT CHECK (resolution_outcome IN (
    'resolved_successfully',
    'still_working_on_it',
    'decided_to_take_break',
    'sought_professional_help',
    'unresolved'
  )),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_incidents_relationship ON conflict_incidents(relationship_id, created_at DESC);
CREATE INDEX idx_incidents_status ON conflict_incidents(status);
CREATE INDEX idx_incidents_topic_category ON conflict_incidents(topic_category);

COMMENT ON TABLE conflict_incidents IS 'Tracks each conflict mediation session from initiation to resolution';

-- Enable RLS
ALTER TABLE conflict_incidents ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conflict_incidents
CREATE POLICY "Partners can view their relationship incidents"
  ON conflict_incidents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

CREATE POLICY "Partners can create incidents in their relationship"
  ON conflict_incidents FOR INSERT
  WITH CHECK (
    initiated_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
        AND r.status = 'active'
    )
  );

CREATE POLICY "Partners can update their relationship incidents"
  ON conflict_incidents FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- Add incident_id to messages to link messages to conflicts (after conflict_incidents created)
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS incident_id UUID REFERENCES conflict_incidents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_incident ON messages(incident_id, created_at ASC);

-- ============================================================================
-- STEP 3: Create conflict_intake_responses table
-- ============================================================================

CREATE TABLE IF NOT EXISTS conflict_intake_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES conflict_incidents(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES profiles(id),
  responder_role TEXT NOT NULL CHECK (responder_role IN ('partner_a', 'partner_b')),

  -- Free-form narrative
  what_happened TEXT NOT NULL,

  -- Structured safety questions
  intensity_rating INTEGER NOT NULL CHECK (intensity_rating BETWEEN 1 AND 10),
  has_happened_before BOOLEAN NOT NULL,
  if_yes_how_often TEXT CHECK (if_yes_how_often IN (
    'first_time',
    'few_times_this_year',
    'monthly',
    'weekly',
    'daily',
    'constantly'
  )),

  current_emotional_state TEXT[] NOT NULL,
  physical_safety_concern BOOLEAN NOT NULL DEFAULT false,
  emotional_safety_concern BOOLEAN NOT NULL DEFAULT false,
  need_immediate_break BOOLEAN NOT NULL DEFAULT false,
  thoughts_of_ending_relationship BOOLEAN NOT NULL DEFAULT false,
  substance_involved BOOLEAN NOT NULL DEFAULT false,

  -- NEW: Urgency and readiness questions
  urgency_to_resolve INTEGER NOT NULL CHECK (urgency_to_resolve BETWEEN 1 AND 10),
  how_triggered INTEGER NOT NULL CHECK (how_triggered BETWEEN 1 AND 10),
  preferred_next_step TEXT[] DEFAULT '{}',

  -- Additional context
  what_you_need_right_now TEXT,
  anything_else TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_intake_incident ON conflict_intake_responses(incident_id);
CREATE INDEX idx_intake_responder ON conflict_intake_responses(responder_id);

COMMENT ON TABLE conflict_intake_responses IS 'Private intake responses from each partner - NEVER shared without consent';
COMMENT ON COLUMN conflict_intake_responses.urgency_to_resolve IS 'How urgently user feels they need to resolve: 1=can wait, 10=need to talk now';
COMMENT ON COLUMN conflict_intake_responses.how_triggered IS 'How triggered/activated user feels: 1=calm, 10=extremely upset';
COMMENT ON COLUMN conflict_intake_responses.preferred_next_step IS 'User preferences: talk_now, take_break, process_alone_first, not_sure';

-- Enable RLS
ALTER TABLE conflict_intake_responses ENABLE ROW LEVEL SECURITY;

-- RLS: Users can only see their OWN intake responses (private)
CREATE POLICY "Users can view their own intake responses"
  ON conflict_intake_responses FOR SELECT
  USING (responder_id = auth.uid());

CREATE POLICY "Users can create their own intake responses"
  ON conflict_intake_responses FOR INSERT
  WITH CHECK (responder_id = auth.uid());

-- ============================================================================
-- STEP 4: Create conflict_safety_evaluations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS conflict_safety_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES conflict_incidents(id) ON DELETE CASCADE,

  -- Overall risk assessment
  safety_level TEXT NOT NULL CHECK (safety_level IN (
    'safe',
    'moderate_concern',
    'high_concern',
    'crisis'
  )),

  -- Specific risk flags
  risk_flags TEXT[] DEFAULT '{}',

  -- PRIMARY RECOMMENDATION (based on safety + personality + history)
  primary_recommendation TEXT NOT NULL CHECK (primary_recommendation IN (
    'professional_help',
    'crisis_resources',
    'take_break',
    'solo_conversations',
    'joint_mediation'
  )),

  -- ALTERNATIVE OPTIONS (user can choose if they disagree with primary)
  alternative_options TEXT[] DEFAULT '{}',

  -- Personalization factors considered
  personalization_factors JSONB NOT NULL,

  -- AI's reasoning (natural language for users)
  evaluation_reasoning TEXT NOT NULL,

  -- If professional help recommended
  professional_help_resources JSONB,

  -- If break recommended
  recommended_break_duration TEXT CHECK (recommended_break_duration IN (
    '1_hour', '4_hours', '12_hours', '24_hours', '48_hours', '1_week'
  )),

  -- Metadata
  evaluated_at TIMESTAMPTZ DEFAULT now(),
  model_version TEXT DEFAULT 'claude-opus-4-5-20251101'
);

CREATE INDEX idx_evaluation_incident ON conflict_safety_evaluations(incident_id);
CREATE INDEX idx_evaluation_safety_level ON conflict_safety_evaluations(safety_level);

COMMENT ON TABLE conflict_safety_evaluations IS 'AI-generated personalized recommendations based on safety, personality, and history';
COMMENT ON COLUMN conflict_safety_evaluations.personalization_factors IS
  'JSONB containing: safety_factors, personality_factors, history_factors, current_state_factors, user_preferences';

-- Enable RLS
ALTER TABLE conflict_safety_evaluations ENABLE ROW LEVEL SECURITY;

-- RLS: Partners can view evaluation for their incidents
CREATE POLICY "Partners can view incident evaluations"
  ON conflict_safety_evaluations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conflict_incidents ci
      JOIN relationships r ON ci.relationship_id = r.id
      WHERE ci.id = incident_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE conflict_safety_evaluations;

-- ============================================================================
-- STEP 5: Create solo_conversations table
-- ============================================================================

CREATE TABLE IF NOT EXISTS solo_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,

  -- Optional link to conflict incident
  incident_id UUID REFERENCES conflict_incidents(id) ON DELETE SET NULL,

  -- Conversation type
  conversation_type TEXT NOT NULL CHECK (conversation_type IN (
    'conflict_processing',
    'general_support',
    'practice_conversation',
    'emotional_processing',
    'reflection',
    'pre_conflict_preparation'
  )),

  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),

  -- Metadata
  started_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_solo_user ON solo_conversations(user_id, started_at DESC);
CREATE INDEX idx_solo_relationship ON solo_conversations(relationship_id);
CREATE INDEX idx_solo_incident ON solo_conversations(incident_id);

COMMENT ON TABLE solo_conversations IS 'Private conversations between user and Eros - NEVER shared with partner';

-- Enable RLS
ALTER TABLE solo_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own solo conversations"
  ON solo_conversations FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own solo conversations"
  ON solo_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own solo conversations"
  ON solo_conversations FOR UPDATE
  USING (user_id = auth.uid());

-- ============================================================================
-- STEP 6: Create solo_conversation_messages table
-- ============================================================================

CREATE TABLE IF NOT EXISTS solo_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES solo_conversations(id) ON DELETE CASCADE,

  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'ai')),
  content TEXT NOT NULL,

  -- AI metadata
  model_version TEXT,
  prompt_type TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_solo_messages_conversation ON solo_conversation_messages(conversation_id, created_at ASC);

COMMENT ON TABLE solo_conversation_messages IS 'Messages in private solo conversations - protected by RLS';
COMMENT ON COLUMN solo_conversation_messages.prompt_type IS 'e.g., empathetic_listening, conflict_coaching, reflection_prompt';

-- Enable RLS
ALTER TABLE solo_conversation_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own solo messages"
  ON solo_conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM solo_conversations sc
      WHERE sc.id = conversation_id AND sc.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages in their own solo conversations"
  ON solo_conversation_messages FOR INSERT
  WITH CHECK (
    sender_type = 'user' AND
    EXISTS (
      SELECT 1 FROM solo_conversations sc
      WHERE sc.id = conversation_id AND sc.user_id = auth.uid()
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE solo_conversation_messages;

-- ============================================================================
-- STEP 7: Enable Realtime on new tables
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE conflict_incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE conflict_intake_responses;
ALTER PUBLICATION supabase_realtime ADD TABLE solo_conversations;

-- ============================================================================
-- STEP 8: Create updated_at trigger
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_conflict_incidents_updated_at
  BEFORE UPDATE ON conflict_incidents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Migration complete
-- ============================================================================

-- Grant necessary permissions
GRANT ALL ON conflict_incidents TO authenticated;
GRANT ALL ON conflict_intake_responses TO authenticated;
GRANT ALL ON conflict_safety_evaluations TO authenticated;
GRANT ALL ON solo_conversations TO authenticated;
GRANT ALL ON solo_conversation_messages TO authenticated;

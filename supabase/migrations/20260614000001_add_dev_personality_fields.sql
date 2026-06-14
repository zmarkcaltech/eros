-- Add personality and behavior fields to profiles for dev testing
-- These fields help simulate realistic partner responses in dev mode

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS personality TEXT,
  ADD COLUMN IF NOT EXISTS hidden_truth TEXT,
  ADD COLUMN IF NOT EXISTS enthusiasm_level TEXT CHECK (enthusiasm_level IN ('low', 'medium', 'high')),
  ADD COLUMN IF NOT EXISTS communication_style TEXT;

COMMENT ON COLUMN profiles.personality IS 'Personality traits for dev simulation (e.g., "introverted, analytical, conflict-avoidant")';
COMMENT ON COLUMN profiles.hidden_truth IS 'Optional secret or withheld information for dev testing (e.g., "feeling resentful about career sacrifice")';
COMMENT ON COLUMN profiles.enthusiasm_level IS 'How engaged/enthusiastic they are in the conversation: low, medium, or high';
COMMENT ON COLUMN profiles.communication_style IS 'Communication approach (e.g., "direct and logical", "emotional and expressive", "passive-aggressive")';

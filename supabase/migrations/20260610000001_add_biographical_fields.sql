-- Migration: Add Biographical Fields
-- Description: Add therapist intake fields to profiles and relationships tables
-- Date: 2026-06-10

-- Add biographical fields to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS age INTEGER CHECK (age >= 18 AND age <= 120);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS pronouns TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS occupation TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS interests TEXT;

-- Add biographical fields to relationships table
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS duration_months INTEGER CHECK (duration_months >= 0);
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS relationship_goals TEXT;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS how_we_met TEXT;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS living_situation TEXT;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS children_info TEXT;

-- Add chat metadata to relationships (moving from conflicts)
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE relationships ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;

-- Create index for sorting relationships by recent activity
CREATE INDEX IF NOT EXISTS idx_relationships_last_message
  ON relationships(last_message_at DESC NULLS LAST);

-- Add comment explaining the fields
COMMENT ON COLUMN profiles.preferred_name IS 'How the user prefers to be addressed';
COMMENT ON COLUMN profiles.age IS 'User age (must be 18+)';
COMMENT ON COLUMN profiles.pronouns IS 'Preferred pronouns (e.g., he/him, she/her, they/them)';
COMMENT ON COLUMN profiles.occupation IS 'User occupation or profession';
COMMENT ON COLUMN profiles.interests IS 'User interests and hobbies';

COMMENT ON COLUMN relationships.duration_months IS 'How long the couple has been together (in months)';
COMMENT ON COLUMN relationships.relationship_goals IS 'What the couple wants to achieve in therapy';
COMMENT ON COLUMN relationships.how_we_met IS 'Story of how the couple met';
COMMENT ON COLUMN relationships.living_situation IS 'Current living arrangement';
COMMENT ON COLUMN relationships.children_info IS 'Information about children (if any)';
COMMENT ON COLUMN relationships.last_message_at IS 'Timestamp of most recent message in relationship chat';
COMMENT ON COLUMN relationships.message_count IS 'Total number of messages in relationship chat';

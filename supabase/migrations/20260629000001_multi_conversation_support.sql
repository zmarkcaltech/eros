-- Enable multiple conversations per user (remove unique constraint)
-- Add conversation naming and status tracking

-- Drop the unique constraint that limits one conversation per user
ALTER TABLE eros_conversations
DROP CONSTRAINT IF EXISTS eros_conversations_user_id_relationship_id_key;

-- Add conversation name and naming metadata
ALTER TABLE eros_conversations
ADD COLUMN IF NOT EXISTS conversation_name TEXT,
ADD COLUMN IF NOT EXISTS auto_named BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS message_count INTEGER DEFAULT 0;

-- Create index for listing conversations
CREATE INDEX IF NOT EXISTS idx_eros_conversations_user_created
ON eros_conversations(user_id, created_at DESC);

-- Update status to have more options
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'eros_conversations_status_check'
  ) THEN
    ALTER TABLE eros_conversations
    DROP CONSTRAINT eros_conversations_status_check;
  END IF;
END $$;

ALTER TABLE eros_conversations
ADD CONSTRAINT eros_conversations_status_check
CHECK (status IN ('active', 'paused', 'completed', 'archived'));

-- Migration: Deprecate Conflicts
-- Description: Remove conflicts table and update notifications to use relationship_id
-- Date: 2026-06-10

-- STEP 1: Update notifications table
-- Drop the foreign key constraint to conflict_id
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_conflict_id_fkey;

-- Drop the conflict_id column
ALTER TABLE notifications DROP COLUMN IF EXISTS conflict_id;

-- Add relationship_id column
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE;

-- Create index for notifications by relationship
CREATE INDEX IF NOT EXISTS idx_notifications_relationship
  ON notifications(relationship_id);

-- STEP 2: Update notification types
-- Drop old constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add new constraint with updated types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('new_message', 'partner_linked', 'bio_update_request'));

-- STEP 3: Drop conflicts table entirely (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS conflicts CASCADE;

-- STEP 4: Drop deprecated perspectives and advice tables
DROP TABLE IF EXISTS _deprecated_perspectives CASCADE;
DROP TABLE IF EXISTS _deprecated_advice CASCADE;
DROP TABLE IF EXISTS perspectives CASCADE;
DROP TABLE IF EXISTS advice CASCADE;

-- Add comment
COMMENT ON TABLE notifications IS 'User notifications for relationship events (messages, partner linking, bio updates)';
COMMENT ON COLUMN notifications.relationship_id IS 'Reference to relationship associated with this notification';

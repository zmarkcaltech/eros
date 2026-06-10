-- Migration: Migrate Messages to Relationships
-- Description: Change messages table to reference relationship_id instead of conflict_id
-- Date: 2026-06-10

-- STEP 1: Backup existing data
CREATE TABLE IF NOT EXISTS _backup_messages AS SELECT * FROM messages;
CREATE TABLE IF NOT EXISTS _backup_conflicts AS SELECT * FROM conflicts;

-- STEP 2: Add relationship_id column to messages (nullable initially)
ALTER TABLE messages ADD COLUMN IF NOT EXISTS relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE;

-- STEP 3: Create index for relationship-based queries
CREATE INDEX IF NOT EXISTS idx_messages_relationship
  ON messages(relationship_id, created_at);

-- STEP 4: Delete all old data (user wants fresh start)
DELETE FROM messages;
DELETE FROM conflicts;

-- STEP 5: Remove conflict_id foreign key constraint and column
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conflict_id_fkey;
ALTER TABLE messages DROP COLUMN IF EXISTS conflict_id;

-- STEP 6: Make relationship_id NOT NULL now that conflict_id is gone
ALTER TABLE messages ALTER COLUMN relationship_id SET NOT NULL;

-- STEP 7: Update RLS policies for messages

-- Drop old conflict-based policies
DROP POLICY IF EXISTS "Partners can view conflict messages" ON messages;
DROP POLICY IF EXISTS "Partners can insert own messages" ON messages;
DROP POLICY IF EXISTS "Service role AI messages" ON messages;

-- New policy: Both partners can view messages in their relationship
CREATE POLICY "Partners can view relationship messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = messages.relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- New policy: Partners can insert messages in their active relationship
CREATE POLICY "Partners can insert relationship messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type IN ('partner_a', 'partner_b')
    AND EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
        AND r.status = 'active'
    )
  );

-- New policy: Service role can insert AI messages
CREATE POLICY "Service role can insert AI messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_type = 'ai'
    AND sender_id IS NULL
    AND auth.jwt()->>'role' = 'service_role'
  );

-- Add comment explaining the change
COMMENT ON COLUMN messages.relationship_id IS 'Reference to the relationship (couples chat is relationship-wide, not per-conflict)';

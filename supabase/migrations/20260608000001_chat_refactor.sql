-- ============================================
-- CHAT REFACTORING MIGRATION
-- Transform from sequential perspectives to real-time chat
-- ============================================

-- ============================================
-- 1. CREATE MESSAGES TABLE
-- ============================================
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL REFERENCES conflicts(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('partner_a', 'partner_b', 'ai')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Metadata for AI messages
  model TEXT,
  tokens_used INTEGER,

  -- Constraints
  CONSTRAINT valid_sender CHECK (
    (sender_type = 'ai' AND sender_id IS NULL) OR
    (sender_type IN ('partner_a', 'partner_b') AND sender_id IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX idx_messages_conflict ON messages(conflict_id, created_at);
CREATE INDEX idx_messages_sender ON messages(sender_id);

-- Enable Realtime for instant message updates
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- ============================================
-- 2. UPDATE CONFLICTS TABLE
-- ============================================

-- Add chat-specific metadata FIRST
ALTER TABLE conflicts ADD COLUMN IF NOT EXISTS last_message_at TIMESTAMPTZ;
ALTER TABLE conflicts ADD COLUMN IF NOT EXISTS message_count INTEGER NOT NULL DEFAULT 0;

-- Drop old status constraint FIRST (before updating data)
ALTER TABLE conflicts DROP CONSTRAINT IF EXISTS conflicts_status_check;

-- NOW update existing conflicts to new status model (without constraint blocking)
UPDATE conflicts SET status = 'archived' WHERE status IN ('completed', 'processing');
UPDATE conflicts SET status = 'active' WHERE status IN ('awaiting_partner_a', 'awaiting_partner_b');

-- Finally add new status constraint (active, archived)
ALTER TABLE conflicts
  ADD CONSTRAINT conflicts_status_check
  CHECK (status IN ('active', 'archived'));

-- ============================================
-- 3. ROW LEVEL SECURITY FOR MESSAGES
-- ============================================

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Both partners can read all messages in their conflicts
CREATE POLICY "Partners can view conflict messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conflicts c
      JOIN relationships r ON r.id = c.relationship_id
      WHERE c.id = messages.conflict_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- Partners can insert their own messages
CREATE POLICY "Partners can insert own messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND sender_type IN ('partner_a', 'partner_b')
    AND EXISTS (
      SELECT 1 FROM conflicts c
      JOIN relationships r ON r.id = c.relationship_id
      WHERE c.id = conflict_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- Service role can insert AI messages
CREATE POLICY "Service role can insert AI messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_type = 'ai'
    AND sender_id IS NULL
    AND auth.jwt()->>'role' = 'service_role'
  );

-- No updates or deletes allowed (messages are immutable)

-- ============================================
-- 4. UPDATE NOTIFICATIONS TABLE
-- ============================================

-- Add message reference column FIRST
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_id UUID REFERENCES messages(id) ON DELETE CASCADE;

-- Drop old notification type constraint FIRST
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Update existing notification types to new values
UPDATE notifications SET type = 'new_message' WHERE type = 'partner_submitted';
UPDATE notifications SET type = 'new_message' WHERE type = 'advice_ready';

-- Add new notification type constraint
ALTER TABLE notifications
  ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('conflict_created', 'new_message', 'partner_linked'));

-- ============================================
-- 5. DEPRECATE OLD TABLES
-- ============================================

-- Rename old tables instead of dropping (allows rollback)
ALTER TABLE IF EXISTS perspectives RENAME TO _deprecated_perspectives;
ALTER TABLE IF EXISTS advice RENAME TO _deprecated_advice;

-- Add deprecation comments
COMMENT ON TABLE _deprecated_perspectives IS 'DEPRECATED: Replaced by messages table in chat refactor (2026-06-08)';
COMMENT ON TABLE _deprecated_advice IS 'DEPRECATED: Replaced by messages table in chat refactor (2026-06-08)';

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Function to determine sender_type based on user_id and conflict
CREATE OR REPLACE FUNCTION get_sender_type(
  p_user_id UUID,
  p_conflict_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_partner_a_id UUID;
  v_partner_b_id UUID;
BEGIN
  -- Get partner IDs from conflict
  SELECT r.partner_a_id, r.partner_b_id
  INTO v_partner_a_id, v_partner_b_id
  FROM conflicts c
  JOIN relationships r ON r.id = c.relationship_id
  WHERE c.id = p_conflict_id;

  -- Return appropriate sender_type
  IF p_user_id = v_partner_a_id THEN
    RETURN 'partner_a';
  ELSIF p_user_id = v_partner_b_id THEN
    RETURN 'partner_b';
  ELSE
    RETURN NULL; -- User not part of this conflict
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update conflict metadata when message is inserted
CREATE OR REPLACE FUNCTION update_conflict_on_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conflicts
  SET
    last_message_at = NEW.created_at,
    message_count = message_count + 1
  WHERE id = NEW.conflict_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update conflict metadata
CREATE TRIGGER on_message_insert
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conflict_on_message();

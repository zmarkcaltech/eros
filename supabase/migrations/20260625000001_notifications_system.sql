-- Migration: Notifications System
-- Description: Add notifications table and triggers for mediation/conversation updates
-- Date: 2026-06-25

-- ============================================================================
-- STEP 1: Create notifications table
-- ============================================================================

-- Create table if not exists
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add columns if they don't exist (for existing tables from partial migrations)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_type') THEN
    ALTER TABLE notifications ADD COLUMN related_type TEXT CHECK (related_type IN ('conflict_incident', 'solo_conversation', 'relationship', 'message'));
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='related_id') THEN
    ALTER TABLE notifications ADD COLUMN related_id UUID;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='action_url') THEN
    ALTER TABLE notifications ADD COLUMN action_url TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='action_label') THEN
    ALTER TABLE notifications ADD COLUMN action_label TEXT;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='read_at') THEN
    ALTER TABLE notifications ADD COLUMN read_at TIMESTAMPTZ;
  END IF;
END $$;

-- Clean up any invalid notifications from partial migrations
DELETE FROM notifications WHERE type NOT IN (
  'mediation_initiated',
  'partner_intake_complete',
  'both_intakes_complete',
  'evaluation_ready',
  'partner_ready_for_next_step',
  'new_message',
  'conflict_resolved',
  'relationship_linked'
);

-- Add/update constraint on type column
DO $$
BEGIN
  ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
  ALTER TABLE notifications ADD CONSTRAINT notifications_type_check CHECK (type IN (
    'mediation_initiated',
    'partner_intake_complete',
    'both_intakes_complete',
    'evaluation_ready',
    'partner_ready_for_next_step',
    'new_message',
    'conflict_resolved',
    'relationship_linked'
  ));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related ON notifications(related_type, related_id);

COMMENT ON TABLE notifications IS 'User notifications for mediation, conversations, and relationship events';

-- ============================================================================
-- STEP 2: Enable RLS
-- ============================================================================

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can mark their own notifications as read
DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Service role can create notifications
DROP POLICY IF EXISTS "Service role can insert notifications" ON notifications;
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- STEP 3: Add notification helper function
-- ============================================================================

CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_related_type TEXT DEFAULT NULL,
  p_related_id UUID DEFAULT NULL,
  p_action_url TEXT DEFAULT NULL,
  p_action_label TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
BEGIN
  INSERT INTO notifications (
    user_id,
    type,
    title,
    message,
    related_type,
    related_id,
    action_url,
    action_label
  ) VALUES (
    p_user_id,
    p_type,
    p_title,
    p_message,
    p_related_type,
    p_related_id,
    p_action_url,
    p_action_label
  )
  RETURNING id INTO v_notification_id;

  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_notification IS 'Helper function to create notifications with proper permissions';

-- ============================================================================
-- STEP 4: Enable Realtime
-- ============================================================================

ALTER PUBLICATION supabase_realtime ADD TABLE notifications;

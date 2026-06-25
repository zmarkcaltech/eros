-- Migration: Notifications System
-- Description: Add notifications table and triggers for mediation/conversation updates
-- Date: 2026-06-25

-- ============================================================================
-- STEP 1: Create notifications table
-- ============================================================================

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification type and content
  type TEXT NOT NULL CHECK (type IN (
    'mediation_initiated',           -- Partner started mediation
    'partner_intake_complete',       -- Partner completed intake, waiting for you
    'both_intakes_complete',         -- Both done, evaluation running
    'evaluation_ready',              -- Recommendation is ready
    'partner_ready_for_next_step',   -- Partner clicked "ready" in solo conversation
    'new_message',                   -- New message in shared chat
    'conflict_resolved',             -- Conflict marked as resolved
    'relationship_linked'            -- Partner accepted relationship link
  )),

  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Related entity
  related_type TEXT CHECK (related_type IN ('conflict_incident', 'solo_conversation', 'relationship', 'message')),
  related_id UUID,

  -- Action link
  action_url TEXT,                   -- Where to go when clicked
  action_label TEXT,                 -- Button text (e.g., "Complete Intake", "View Recommendation")

  -- Status
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

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

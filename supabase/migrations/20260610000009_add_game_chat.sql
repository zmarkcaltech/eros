-- Migration: Add Game Chat for MapQuest Sessions
-- Description: Allow partners to chat during game sessions (for trash talk, encouragement)
-- Date: 2026-06-10

-- Create game_chat_messages table
CREATE TABLE IF NOT EXISTS game_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES love_map_sessions(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id),
  sender_type TEXT NOT NULL CHECK (sender_type IN ('partner_a', 'partner_b')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_game_chat_session ON game_chat_messages(session_id, created_at DESC);

-- Enable RLS
ALTER TABLE game_chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Partners can view chat messages in their sessions
CREATE POLICY "Partners can view game chat"
  ON game_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM love_map_sessions s
      JOIN relationships r ON r.id = s.relationship_id
      WHERE s.id = session_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- RLS Policy: Partners can send chat messages in their sessions
CREATE POLICY "Partners can send game chat"
  ON game_chat_messages FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM love_map_sessions s
      JOIN relationships r ON r.id = s.relationship_id
      WHERE s.id = session_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
        AND s.status IN ('in_progress', 'paused')
    )
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE game_chat_messages;

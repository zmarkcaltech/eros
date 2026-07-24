-- Create standalone Eros conversation system (not tied to conflicts)
-- This replaces the conflict-linked solo conversations

-- Main conversations table (one per user)
CREATE TABLE IF NOT EXISTS eros_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,

  -- User context gathered during conversation
  recent_events TEXT,
  conversation_goals TEXT[],
  relationship_goals TEXT[],
  safety_checked BOOLEAN DEFAULT false,
  safety_concerns TEXT,
  relevant_history TEXT,
  deescalation_preferences JSONB, -- {prefers_direct: bool, needs_time_to_process: bool, etc}

  -- Conversation state
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  -- One conversation per user per relationship
  UNIQUE(user_id, relationship_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS eros_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES eros_conversations(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'ai')),
  content TEXT NOT NULL,

  -- AI metadata
  model_version TEXT,
  prompt_type TEXT, -- 'discovery', 'goal_setting', 'message_drafting', 'perspective_taking'

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_eros_conversations_user ON eros_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_eros_conversations_relationship ON eros_conversations(relationship_id);
CREATE INDEX IF NOT EXISTS idx_eros_messages_conversation ON eros_conversation_messages(conversation_id, created_at);

-- Enable RLS
ALTER TABLE eros_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE eros_conversation_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for eros_conversations
DROP POLICY IF EXISTS "Users can view their own Eros conversations" ON eros_conversations;
CREATE POLICY "Users can view their own Eros conversations"
  ON eros_conversations FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create their own Eros conversations" ON eros_conversations;
CREATE POLICY "Users can create their own Eros conversations"
  ON eros_conversations FOR INSERT
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own Eros conversations" ON eros_conversations;
CREATE POLICY "Users can update their own Eros conversations"
  ON eros_conversations FOR UPDATE
  USING (user_id = auth.uid());

-- RLS Policies for eros_conversation_messages
DROP POLICY IF EXISTS "Users can view their Eros messages" ON eros_conversation_messages;
CREATE POLICY "Users can view their Eros messages"
  ON eros_conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM eros_conversations ec
      WHERE ec.id = conversation_id
        AND ec.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users and server can create Eros messages" ON eros_conversation_messages;
CREATE POLICY "Users and server can create Eros messages"
  ON eros_conversation_messages FOR INSERT
  WITH CHECK (
    -- User messages
    (
      sender_type = 'user'
      AND EXISTS (
        SELECT 1 FROM eros_conversations ec
        WHERE ec.id = conversation_id
          AND ec.user_id = auth.uid()
      )
    )
    -- OR AI messages (server-side)
    OR sender_type = 'ai'
  );

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE eros_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE eros_conversation_messages;

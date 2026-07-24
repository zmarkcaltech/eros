-- Fix RLS policies for solo_conversation_messages to allow server-side AI message creation

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Users can send messages in their solo conversations" ON solo_conversation_messages;

-- Create new INSERT policy that allows:
-- 1. Users to insert their own messages (sender_type = 'user')
-- 2. Server (service role) to insert AI messages (sender_type = 'ai')
CREATE POLICY "Users and server can create solo messages"
  ON solo_conversation_messages FOR INSERT
  WITH CHECK (
    -- Allow if user is inserting their own message
    (
      sender_type = 'user'
      AND EXISTS (
        SELECT 1 FROM solo_conversations sc
        WHERE sc.id = conversation_id
          AND sc.user_id = auth.uid()
      )
    )
    -- OR allow if this is an AI message (server-side insert)
    OR sender_type = 'ai'
  );

-- Ensure SELECT policy exists for users to read their conversation messages
DROP POLICY IF EXISTS "Users can view their solo conversation messages" ON solo_conversation_messages;

CREATE POLICY "Users can view their solo conversation messages"
  ON solo_conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM solo_conversations sc
      WHERE sc.id = conversation_id
        AND sc.user_id = auth.uid()
    )
  );

-- No UPDATE or DELETE policies needed - messages are immutable

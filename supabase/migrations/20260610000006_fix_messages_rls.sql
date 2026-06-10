-- Migration: Fix Messages RLS Policies
-- Description: Recreate RLS policies for relationship_id
-- Date: 2026-06-10

-- Drop ALL existing policies on messages table
DROP POLICY IF EXISTS "Partners can view conflict messages" ON messages;
DROP POLICY IF EXISTS "Partners can insert own messages" ON messages;
DROP POLICY IF EXISTS "Service role AI messages" ON messages;
DROP POLICY IF EXISTS "Partners can view relationship messages" ON messages;
DROP POLICY IF EXISTS "Partners can insert relationship messages" ON messages;
DROP POLICY IF EXISTS "Service role can insert AI messages" ON messages;

-- Recreate policies for relationship-based model

-- Policy 1: Both partners can view messages in their relationship
CREATE POLICY "Partners can view relationship messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = messages.relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- Policy 2: Partners can insert messages in their active relationship
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

-- Policy 3: Service role can insert AI messages
CREATE POLICY "Service role can insert AI messages"
  ON messages FOR INSERT
  WITH CHECK (
    sender_type = 'ai'
    AND sender_id IS NULL
  );

-- Ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

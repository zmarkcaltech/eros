-- Migration: Update Helper Functions
-- Description: Replace conflict-based functions with relationship-based ones
-- Date: 2026-06-10

-- STEP 1: Drop old conflict-based functions and triggers
DROP TRIGGER IF EXISTS on_message_insert ON messages;
DROP TRIGGER IF EXISTS on_message_insert_update_conflict ON messages;
DROP FUNCTION IF EXISTS get_sender_type(UUID, UUID);
DROP FUNCTION IF EXISTS update_conflict_on_message() CASCADE;

-- STEP 2: Create new function to determine sender type for a relationship
CREATE OR REPLACE FUNCTION get_sender_type_for_relationship(
  p_user_id UUID,
  p_relationship_id UUID
)
RETURNS TEXT AS $$
DECLARE
  v_partner_a_id UUID;
  v_partner_b_id UUID;
BEGIN
  -- Get both partner IDs from the relationship
  SELECT partner_a_id, partner_b_id
  INTO v_partner_a_id, v_partner_b_id
  FROM relationships
  WHERE id = p_relationship_id;

  -- Determine which partner the user is
  IF p_user_id = v_partner_a_id THEN
    RETURN 'partner_a';
  ELSIF p_user_id = v_partner_b_id THEN
    RETURN 'partner_b';
  ELSE
    RETURN NULL;  -- User is not part of this relationship
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment
COMMENT ON FUNCTION get_sender_type_for_relationship IS 'Determines if user is partner_a or partner_b in a relationship';

-- STEP 3: Create trigger function to update relationship metadata when message is inserted
CREATE OR REPLACE FUNCTION update_relationship_on_message()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the relationship's last_message_at and increment message_count
  UPDATE relationships
  SET
    last_message_at = NEW.created_at,
    message_count = message_count + 1
  WHERE id = NEW.relationship_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add comment
COMMENT ON FUNCTION update_relationship_on_message IS 'Automatically updates relationship metadata when a new message is inserted';

-- STEP 4: Create trigger to call the function after each message insert
CREATE TRIGGER on_message_insert_update_relationship
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION update_relationship_on_message();

-- Add comment
COMMENT ON TRIGGER on_message_insert_update_relationship ON messages IS 'Updates relationship last_message_at and message_count on new messages';

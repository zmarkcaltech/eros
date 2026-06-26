-- Clear all existing conflict mediations to start fresh with new AI features
-- Run this in your Supabase SQL editor

-- This will delete:
-- - All conflict incidents
-- - All intake responses (CASCADE)
-- - All solo conversations (CASCADE)
-- - All solo conversation messages (CASCADE)
-- - All safety evaluations (CASCADE)

BEGIN;

-- Delete all solo conversation messages first (safest order)
DELETE FROM solo_conversation_messages;

-- Delete all solo conversations
DELETE FROM solo_conversations;

-- Delete all conflict safety evaluations
DELETE FROM conflict_safety_evaluations;

-- Delete all conflict intake responses
DELETE FROM conflict_intake_responses;

-- Delete all conflict incidents (this is the parent table)
DELETE FROM conflict_incidents;

-- Verify deletions
SELECT 'conflict_incidents' as table_name, COUNT(*) as remaining_rows FROM conflict_incidents
UNION ALL
SELECT 'conflict_intake_responses', COUNT(*) FROM conflict_intake_responses
UNION ALL
SELECT 'solo_conversations', COUNT(*) FROM solo_conversations
UNION ALL
SELECT 'solo_conversation_messages', COUNT(*) FROM solo_conversation_messages
UNION ALL
SELECT 'conflict_safety_evaluations', COUNT(*) FROM conflict_safety_evaluations;

COMMIT;

-- Expected output: All tables should show 0 remaining_rows

-- Check if Eros conversation tables exist
SELECT
  tablename,
  CASE
    WHEN tablename = 'eros_conversations' THEN '✅ Main conversation table'
    WHEN tablename = 'eros_conversation_messages' THEN '✅ Messages table'
    ELSE 'Unknown table'
  END as description
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('eros_conversations', 'eros_conversation_messages')
ORDER BY tablename;

-- Expected output: 2 rows if migration was run
-- If you get 0 rows, the migration hasn't been run yet

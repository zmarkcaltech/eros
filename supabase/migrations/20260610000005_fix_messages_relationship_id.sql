-- Migration: Fix Messages Relationship ID
-- Description: Ensure relationship_id exists on messages table
-- Date: 2026-06-10

-- Check if relationship_id already exists, if not add it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'relationship_id'
    ) THEN
        ALTER TABLE messages ADD COLUMN relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE;
        CREATE INDEX idx_messages_relationship ON messages(relationship_id, created_at);
    END IF;
END $$;

-- Check if conflict_id still exists, if so remove it
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'conflict_id'
    ) THEN
        ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_conflict_id_fkey;
        ALTER TABLE messages DROP COLUMN conflict_id;
    END IF;
END $$;

-- Make sure relationship_id is NOT NULL
DO $$
BEGIN
    -- Only set NOT NULL if there are no rows or all rows have relationship_id
    IF NOT EXISTS (SELECT 1 FROM messages WHERE relationship_id IS NULL) THEN
        ALTER TABLE messages ALTER COLUMN relationship_id SET NOT NULL;
    END IF;
END $$;

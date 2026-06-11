-- Migration: Enable Realtime for Love Maps Tables
-- Description: Enable Supabase Realtime for love_map_sessions and love_map_rounds
-- Date: 2026-06-10

-- Enable Realtime for sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE love_map_sessions;

-- Enable Realtime for rounds table
ALTER PUBLICATION supabase_realtime ADD TABLE love_map_rounds;

-- Enable Realtime for questions table (optional, but good to have)
ALTER PUBLICATION supabase_realtime ADD TABLE love_map_questions;

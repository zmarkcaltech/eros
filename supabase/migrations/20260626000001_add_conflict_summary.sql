-- Migration: Add AI-generated conflict summary and name
-- Description: Store Eros-generated de-escalatory summaries for Partner 2
-- Date: 2026-06-26

-- Add columns to conflict_incidents
ALTER TABLE conflict_incidents
  ADD COLUMN IF NOT EXISTS conflict_name TEXT,
  ADD COLUMN IF NOT EXISTS partner_a_summary_for_partner_b TEXT,
  ADD COLUMN IF NOT EXISTS partner_b_summary_for_partner_a TEXT;

COMMENT ON COLUMN conflict_incidents.conflict_name IS 'AI-generated neutral name for the conflict (e.g., "Communication about household responsibilities")';
COMMENT ON COLUMN conflict_incidents.partner_a_summary_for_partner_b IS 'De-escalatory summary of Partner A''s perspective, shown to Partner B';
COMMENT ON COLUMN conflict_incidents.partner_b_summary_for_partner_a IS 'De-escalatory summary of Partner B''s perspective, shown to Partner A';

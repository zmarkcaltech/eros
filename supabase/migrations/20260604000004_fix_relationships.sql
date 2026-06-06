-- ============================================
-- FIX RELATIONSHIPS TABLE
-- ============================================
-- Make partner_b_id nullable since Partner B joins later
-- Update constraint to only check when both partners exist

-- Drop existing constraints
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS different_partners;
ALTER TABLE relationships DROP CONSTRAINT IF EXISTS unique_couple;

-- Make partner_b_id nullable
ALTER TABLE relationships ALTER COLUMN partner_b_id DROP NOT NULL;

-- Add back constraint that only applies when both partners are set
ALTER TABLE relationships ADD CONSTRAINT different_partners
  CHECK (partner_b_id IS NULL OR partner_a_id != partner_b_id);

-- Add back unique constraint (only when both partners exist)
CREATE UNIQUE INDEX unique_couple_when_complete
  ON relationships(partner_a_id, partner_b_id)
  WHERE partner_b_id IS NOT NULL;

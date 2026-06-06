-- ============================================
-- EROS COUPLES THERAPY APP - DATABASE FUNCTIONS AND TRIGGERS
-- ============================================

-- ============================================
-- FUNCTION: Generate unique link code
-- ============================================
CREATE OR REPLACE FUNCTION generate_link_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN;
BEGIN
  LOOP
    -- Generate 8-character alphanumeric code
    code := upper(substring(md5(random()::text) from 1 for 8));

    -- Check if code already exists
    SELECT EXISTS(SELECT 1 FROM relationships WHERE link_code = code) INTO exists;

    EXIT WHEN NOT exists;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- TRIGGER: Auto-generate link code on relationship creation
-- ============================================
CREATE OR REPLACE FUNCTION set_link_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.link_code IS NULL THEN
    NEW.link_code := generate_link_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_relationship_link_code
  BEFORE INSERT ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION set_link_code();

-- ============================================
-- TRIGGER: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_relationships_updated_at
  BEFORE UPDATE ON relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_conflicts_updated_at
  BEFORE UPDATE ON conflicts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCTION: Get partner ID
-- ============================================
-- Helper function to get the other partner in a relationship
CREATE OR REPLACE FUNCTION get_partner_id(
  p_relationship_id UUID,
  p_user_id UUID
)
RETURNS UUID AS $$
DECLARE
  partner_id UUID;
BEGIN
  SELECT
    CASE
      WHEN partner_a_id = p_user_id THEN partner_b_id
      WHEN partner_b_id = p_user_id THEN partner_a_id
      ELSE NULL
    END INTO partner_id
  FROM relationships
  WHERE id = p_relationship_id;

  RETURN partner_id;
END;
$$ LANGUAGE plpgsql;

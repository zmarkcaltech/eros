-- ============================================
-- EROS COUPLES THERAPY APP - RLS POLICIES
-- ============================================
-- These policies enforce privacy and security at the database level

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE conflicts ENABLE ROW LEVEL SECURITY;
ALTER TABLE perspectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE advice ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can read their partner's profile (if in a relationship)
CREATE POLICY "Users can view partner profile"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE (r.partner_a_id = auth.uid() AND r.partner_b_id = profiles.id)
         OR (r.partner_b_id = auth.uid() AND r.partner_a_id = profiles.id)
    )
  );

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- RELATIONSHIPS POLICIES
-- ============================================
-- Users can view relationships they're part of
CREATE POLICY "Users can view own relationships"
  ON relationships FOR SELECT
  USING (
    partner_a_id = auth.uid() OR partner_b_id = auth.uid()
  );

-- Users can create relationships (as partner A)
CREATE POLICY "Users can create relationships"
  ON relationships FOR INSERT
  WITH CHECK (partner_a_id = auth.uid());

-- Users can update relationships they're part of
CREATE POLICY "Users can update own relationships"
  ON relationships FOR UPDATE
  USING (
    partner_a_id = auth.uid() OR partner_b_id = auth.uid()
  );

-- ============================================
-- CONFLICTS POLICIES
-- ============================================
-- Users can view conflicts in their relationship
CREATE POLICY "Users can view relationship conflicts"
  ON conflicts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = conflicts.relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- Users can create conflicts in their relationship
CREATE POLICY "Users can create conflicts"
  ON conflicts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
    AND initiated_by = auth.uid()
  );

-- Users can update conflicts in their relationship
CREATE POLICY "Users can update conflicts"
  ON conflicts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM relationships r
      WHERE r.id = conflicts.relationship_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- ============================================
-- PERSPECTIVES POLICIES (CRITICAL FOR PRIVACY)
-- ============================================
-- Users can ONLY view their OWN perspectives, never their partner's
CREATE POLICY "Users can view only own perspectives"
  ON perspectives FOR SELECT
  USING (submitted_by = auth.uid());

-- Users can insert their own perspective
CREATE POLICY "Users can insert own perspective"
  ON perspectives FOR INSERT
  WITH CHECK (submitted_by = auth.uid());

-- Users cannot update perspectives (immutable once submitted)
-- No update policy = no updates allowed

-- ============================================
-- ADVICE POLICIES
-- ============================================
-- Users can view advice for conflicts in their relationship
CREATE POLICY "Users can view relationship advice"
  ON advice FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conflicts c
      JOIN relationships r ON r.id = c.relationship_id
      WHERE c.id = advice.conflict_id
        AND (r.partner_a_id = auth.uid() OR r.partner_b_id = auth.uid())
    )
  );

-- Only service role can insert advice (via API)
CREATE POLICY "Service role can insert advice"
  ON advice FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- NOTIFICATIONS POLICIES
-- ============================================
-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Service role can insert notifications
CREATE POLICY "Service role can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.jwt()->>'role' = 'service_role');

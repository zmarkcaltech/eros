-- ============================================
-- EROS COUPLES THERAPY APP - INITIAL SCHEMA
-- ============================================

-- ============================================
-- PROFILES TABLE
-- ============================================
-- Extends auth.users with additional profile information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  bio TEXT,
  self_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- RELATIONSHIPS TABLE
-- ============================================
-- Represents a couple's relationship
CREATE TABLE relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_a_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_b_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive')),
  relationship_description TEXT,
  link_code TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT different_partners CHECK (partner_a_id != partner_b_id),
  CONSTRAINT unique_couple UNIQUE (partner_a_id, partner_b_id)
);

-- Indexes for quick lookups
CREATE INDEX idx_relationships_partner_a ON relationships(partner_a_id);
CREATE INDEX idx_relationships_partner_b ON relationships(partner_b_id);
CREATE INDEX idx_relationships_link_code ON relationships(link_code);

-- ============================================
-- CONFLICTS TABLE
-- ============================================
-- Represents a conflict submitted by the couple
CREATE TABLE conflicts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'awaiting_partner_a' CHECK (
    status IN ('awaiting_partner_a', 'awaiting_partner_b', 'processing', 'completed')
  ),
  initiated_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conflicts_relationship ON conflicts(relationship_id);
CREATE INDEX idx_conflicts_status ON conflicts(status);

-- ============================================
-- PERSPECTIVES TABLE
-- ============================================
-- Private submissions from each partner (CRITICAL: Privacy enforced via RLS)
CREATE TABLE perspectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL REFERENCES conflicts(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES profiles(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_perspective_per_partner UNIQUE (conflict_id, submitted_by)
);

CREATE INDEX idx_perspectives_conflict ON perspectives(conflict_id);
CREATE INDEX idx_perspectives_submitted_by ON perspectives(submitted_by);

-- ============================================
-- ADVICE TABLE
-- ============================================
-- AI-generated advice from Claude (visible to both partners)
CREATE TABLE advice (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conflict_id UUID NOT NULL REFERENCES conflicts(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  model TEXT NOT NULL,
  tokens_used INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT one_advice_per_conflict UNIQUE (conflict_id)
);

CREATE INDEX idx_advice_conflict ON advice(conflict_id);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
-- Track notifications sent to partners
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conflict_id UUID REFERENCES conflicts(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('partner_submitted', 'advice_ready', 'partner_linked')),
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);

-- Table to store dev simulation runs for testing and evaluation

CREATE TABLE IF NOT EXISTS dev_simulation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Configuration
  scenario TEXT NOT NULL,
  num_turns INTEGER NOT NULL,

  -- Partner A config
  partner_a_config JSONB NOT NULL,

  -- Partner B config
  partner_b_config JSONB NOT NULL,

  -- Relationship config
  relationship_config JSONB NOT NULL,

  -- Results
  relationship_id UUID,
  transcript JSONB NOT NULL, -- Array of messages with timestamps

  -- Metadata
  total_messages INTEGER,
  mediator_messages INTEGER,
  partner_a_messages INTEGER,
  partner_b_messages INTEGER,
  duration_seconds INTEGER,

  -- Evaluation fields (can be filled in later)
  evaluation_score DECIMAL,
  evaluation_notes TEXT,
  tags TEXT[] -- For categorizing simulations
);

CREATE INDEX idx_dev_simulations_created ON dev_simulation_runs(created_at DESC);
CREATE INDEX idx_dev_simulations_tags ON dev_simulation_runs USING GIN(tags);
CREATE INDEX idx_dev_simulations_scenario ON dev_simulation_runs(scenario);

COMMENT ON TABLE dev_simulation_runs IS 'Stores automated dev simulations for testing and evaluating mediator responses';
COMMENT ON COLUMN dev_simulation_runs.transcript IS 'Full conversation transcript as JSON array';
COMMENT ON COLUMN dev_simulation_runs.evaluation_score IS 'Optional score for grading mediator performance (0-100)';
COMMENT ON COLUMN dev_simulation_runs.tags IS 'Tags for filtering (e.g., ["high-conflict", "passive-aggressive", "withdrawal-pattern"])';

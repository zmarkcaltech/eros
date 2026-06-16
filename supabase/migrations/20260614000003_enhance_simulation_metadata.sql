-- Enhance dev_simulation_runs table with comprehensive testing metadata

ALTER TABLE dev_simulation_runs
  -- Scenario metadata
  ADD COLUMN IF NOT EXISTS scenario_category TEXT CHECK (scenario_category IN ('everyday_conflict', 'recurring_pattern', 'heated_non_dangerous', 'safety_boundary', 'edge_adversarial')),
  ADD COLUMN IF NOT EXISTS severity TEXT CHECK (severity IN ('low', 'low_medium', 'medium', 'medium_high', 'high')),
  ADD COLUMN IF NOT EXISTS topic TEXT,
  ADD COLUMN IF NOT EXISTS partner_a_persona TEXT,
  ADD COLUMN IF NOT EXISTS partner_b_persona TEXT,
  ADD COLUMN IF NOT EXISTS hidden_truth_a TEXT,
  ADD COLUMN IF NOT EXISTS hidden_truth_b TEXT,
  ADD COLUMN IF NOT EXISTS safety_risk TEXT,
  ADD COLUMN IF NOT EXISTS max_rounds INTEGER,

  -- Execution metrics
  ADD COLUMN IF NOT EXISTS actual_rounds INTEGER,
  ADD COLUMN IF NOT EXISTS conversation_completed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS avg_ai_message_length_words DECIMAL,
  ADD COLUMN IF NOT EXISTS max_ai_message_length_words INTEGER,
  ADD COLUMN IF NOT EXISTS partner_balance_ratio DECIMAL,

  -- Outcome tracking
  ADD COLUMN IF NOT EXISTS ended_with_agreement BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS ended_with_pause BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_a_reflected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_b_reflected BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_a_summary_confirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_b_summary_confirmed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS repair_attempt_created BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS specific_request_created_a BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS specific_request_created_b BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS agreement_created BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS followup_suggested BOOLEAN DEFAULT false,

  -- Quality tracking
  ADD COLUMN IF NOT EXISTS humor_used BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS humor_helpful BOOLEAN,
  ADD COLUMN IF NOT EXISTS humor_annoying BOOLEAN,
  ADD COLUMN IF NOT EXISTS side_taking_detected BOOLEAN DEFAULT false,

  -- Evaluation scores (1-5 scale)
  ADD COLUMN IF NOT EXISTS mediation_quality_score DECIMAL,
  ADD COLUMN IF NOT EXISTS partner_a_experience_score DECIMAL,
  ADD COLUMN IF NOT EXISTS partner_b_experience_score DECIMAL,
  ADD COLUMN IF NOT EXISTS safety_score TEXT CHECK (safety_score IN ('pass', 'fail')),
  ADD COLUMN IF NOT EXISTS monetization_score DECIMAL,

  -- Pass status
  ADD COLUMN IF NOT EXISTS pass_status TEXT CHECK (pass_status IN ('pass', 'weak_pass', 'fail')),

  -- Detailed feedback
  ADD COLUMN IF NOT EXISTS single_most_important_improvement TEXT,
  ADD COLUMN IF NOT EXISTS top_strengths TEXT[],
  ADD COLUMN IF NOT EXISTS top_weaknesses TEXT[],
  ADD COLUMN IF NOT EXISTS failure_tags TEXT[],

  -- Evaluation details (full JSON from each judge)
  ADD COLUMN IF NOT EXISTS mediation_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS partner_a_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS partner_b_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS safety_evaluation JSONB,
  ADD COLUMN IF NOT EXISTS monetization_evaluation JSONB;

-- Create additional indexes for filtering
CREATE INDEX IF NOT EXISTS idx_dev_simulations_category ON dev_simulation_runs(scenario_category);
CREATE INDEX IF NOT EXISTS idx_dev_simulations_severity ON dev_simulation_runs(severity);
CREATE INDEX IF NOT EXISTS idx_dev_simulations_safety_risk ON dev_simulation_runs(safety_risk) WHERE safety_risk IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dev_simulations_pass_status ON dev_simulation_runs(pass_status);
CREATE INDEX IF NOT EXISTS idx_dev_simulations_safety_score ON dev_simulation_runs(safety_score);
CREATE INDEX IF NOT EXISTS idx_dev_simulations_failure_tags ON dev_simulation_runs USING GIN(failure_tags);

-- Comments for documentation
COMMENT ON COLUMN dev_simulation_runs.scenario_category IS 'Category: everyday_conflict, recurring_pattern, heated_non_dangerous, safety_boundary, edge_adversarial';
COMMENT ON COLUMN dev_simulation_runs.severity IS 'Conflict severity level: low, low_medium, medium, medium_high, high';
COMMENT ON COLUMN dev_simulation_runs.topic IS 'Brief description of conflict topic';
COMMENT ON COLUMN dev_simulation_runs.partner_a_persona IS 'Partner A behavioral persona (e.g., blamer, withdrawer, defender)';
COMMENT ON COLUMN dev_simulation_runs.partner_b_persona IS 'Partner B behavioral persona';
COMMENT ON COLUMN dev_simulation_runs.hidden_truth_a IS 'Partner A hidden vulnerable feeling underneath surface position';
COMMENT ON COLUMN dev_simulation_runs.hidden_truth_b IS 'Partner B hidden vulnerable feeling';
COMMENT ON COLUMN dev_simulation_runs.safety_risk IS 'Type of safety issue if present (e.g., fear_intimidation, self_harm_threat, coercive_control)';
COMMENT ON COLUMN dev_simulation_runs.failure_tags IS 'Array of specific failure modes from taxonomy (e.g., sided_with_partner_a, too_long, no_specific_agreement)';
COMMENT ON COLUMN dev_simulation_runs.pass_status IS 'Overall pass status: pass, weak_pass, or fail';
COMMENT ON COLUMN dev_simulation_runs.safety_score IS 'Safety evaluation: pass or fail (must be pass before launch)';
COMMENT ON COLUMN dev_simulation_runs.monetization_score IS 'Willingness-to-pay potential score (1-5)';

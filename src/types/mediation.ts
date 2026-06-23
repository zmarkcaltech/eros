// Mediation System Type Definitions
// Generated from database schema in supabase/migrations/20260623000001_mediation_system.sql

export type ConflictIncidentStatus =
  | 'awaiting_partner_intake'
  | 'safety_evaluation'
  | 'recommend_professional_help'
  | 'recommend_break'
  | 'solo_conversations'
  | 'joint_mediation_ready'
  | 'in_joint_mediation'
  | 'resolved'
  | 'abandoned';

export type ResolutionOutcome =
  | 'resolved_successfully'
  | 'still_working_on_it'
  | 'decided_to_take_break'
  | 'sought_professional_help'
  | 'unresolved';

export interface ConflictIncident {
  id: string;
  relationship_id: string;
  initiated_by: string;
  initiated_at: string;
  status: ConflictIncidentStatus;
  topic?: string;
  topic_category?: string;
  partner_a_intake_completed_at?: string;
  partner_b_intake_completed_at?: string;
  joint_mediation_started_at?: string;
  resolved_at?: string;
  resolution_outcome?: ResolutionOutcome;
  created_at: string;
  updated_at: string;
}

export type ConflictFrequency =
  | 'first_time'
  | 'few_times_this_year'
  | 'monthly'
  | 'weekly'
  | 'daily'
  | 'constantly';

export type EmotionalState =
  | 'angry'
  | 'hurt'
  | 'sad'
  | 'frustrated'
  | 'confused'
  | 'scared'
  | 'disappointed'
  | 'betrayed'
  | 'anxious'
  | 'overwhelmed'
  | 'numb';

export type PreferredNextStep =
  | 'talk_now'
  | 'take_break'
  | 'process_alone_first'
  | 'not_sure';

export interface ConflictIntakeResponse {
  id: string;
  incident_id: string;
  responder_id: string;
  responder_role: 'partner_a' | 'partner_b';
  what_happened: string;
  intensity_rating: number; // 1-10
  has_happened_before: boolean;
  if_yes_how_often?: ConflictFrequency;
  current_emotional_state: EmotionalState[];
  physical_safety_concern: boolean;
  emotional_safety_concern: boolean;
  need_immediate_break: boolean;
  thoughts_of_ending_relationship: boolean;
  substance_involved: boolean;
  urgency_to_resolve: number; // 1-10
  how_triggered: number; // 1-10
  preferred_next_step: PreferredNextStep[];
  what_you_need_right_now?: string;
  anything_else?: string;
  created_at: string;
}

export type SafetyLevel =
  | 'safe'
  | 'moderate_concern'
  | 'high_concern'
  | 'crisis';

export type RiskFlag =
  | 'physical_safety'
  | 'emotional_abuse'
  | 'substance_use'
  | 'extreme_intensity'
  | 'relationship_threat'
  | 'chronic_pattern';

export type RecommendedAction =
  | 'professional_help'
  | 'crisis_resources'
  | 'take_break'
  | 'solo_conversations'
  | 'joint_mediation';

export type BreakDuration =
  | '1_hour'
  | '4_hours'
  | '12_hours'
  | '24_hours'
  | '48_hours'
  | '1_week';

export interface PersonalizationFactors {
  safety_factors: string[];
  personality_factors: string[];
  history_factors: string[];
  current_state_factors: string[];
  user_preferences: string[];
}

export interface ProfessionalHelpResources {
  crisis_lines: Array<{
    name: string;
    phone: string;
    text?: string;
    hours: string;
  }>;
  therapist_directories: Array<{
    name: string;
    url: string;
    description: string;
  }>;
  local_resources?: Array<{
    name: string;
    phone?: string;
    url?: string;
    address?: string;
  }>;
  why_professional_help?: string;
}

export interface ConflictSafetyEvaluation {
  id: string;
  incident_id: string;
  safety_level: SafetyLevel;
  risk_flags: RiskFlag[];
  primary_recommendation: RecommendedAction;
  alternative_options: RecommendedAction[];
  personalization_factors: PersonalizationFactors;
  evaluation_reasoning: string;
  professional_help_resources?: ProfessionalHelpResources;
  recommended_break_duration?: BreakDuration;
  evaluated_at: string;
  model_version: string;
}

export type ConversationType =
  | 'conflict_processing'
  | 'general_support'
  | 'practice_conversation'
  | 'emotional_processing'
  | 'reflection'
  | 'pre_conflict_preparation';

export type ConversationStatus = 'active' | 'completed' | 'abandoned';

export interface SoloConversation {
  id: string;
  user_id: string;
  relationship_id: string;
  incident_id?: string;
  conversation_type: ConversationType;
  status: ConversationStatus;
  started_at: string;
  last_message_at: string;
  completed_at?: string;
}

export type PromptType =
  | 'empathetic_listening'
  | 'conflict_coaching'
  | 'reflection_prompt'
  | 'de_escalation'
  | 'empathy_building'
  | 'needs_identification';

export interface SoloConversationMessage {
  id: string;
  conversation_id: string;
  sender_type: 'user' | 'ai';
  content: string;
  model_version?: string;
  prompt_type?: PromptType;
  created_at: string;
}

// Onboarding types
export type ConflictResolutionPreference =
  | 'talk_right_away'
  | 'cool_down_first'
  | 'need_space'
  | 'process_alone_first'
  | 'write_first'
  | 'sleep_on_it';

// API Request/Response types
export interface InitiateMediationRequest {
  relationship_id: string;
}

export interface InitiateMediationResponse {
  incident_id: string;
  status: ConflictIncidentStatus;
  next_step: 'partner_a_intake';
}

export interface SubmitIntakeRequest {
  what_happened: string;
  intensity_rating: number;
  has_happened_before: boolean;
  if_yes_how_often?: ConflictFrequency;
  current_emotional_state: EmotionalState[];
  physical_safety_concern: boolean;
  emotional_safety_concern: boolean;
  need_immediate_break: boolean;
  thoughts_of_ending_relationship: boolean;
  substance_involved: boolean;
  urgency_to_resolve: number;
  how_triggered: number;
  preferred_next_step: PreferredNextStep[];
  what_you_need_right_now?: string;
  anything_else?: string;
}

export interface SubmitIntakeResponse {
  intake_id: string;
  next_step: 'solo_conversation';
  solo_conversation_id: string;
}

export interface SendSoloMessageRequest {
  content: string;
}

export interface SendSoloMessageResponse {
  user_message: SoloConversationMessage;
  ai_response: SoloConversationMessage;
}

export interface GetEvaluationResponse {
  evaluation: ConflictSafetyEvaluation;
}

export interface ResolveIncidentRequest {
  resolution_outcome: ResolutionOutcome;
}

export interface ResolveIncidentResponse {
  success: boolean;
}

export interface StartSoloConversationRequest {
  relationship_id: string;
  conversation_type: ConversationType;
  incident_id?: string;
}

export interface StartSoloConversationResponse {
  conversation_id: string;
  opening_message: SoloConversationMessage;
}

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type {
  GetEvaluationResponse,
  ConflictSafetyEvaluation,
  PersonalizationFactors,
  SafetyLevel,
  RecommendedAction,
  RiskFlag
} from '@/types/mediation';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: incidentId } = await params;

    // Get the incident with relationship data
    const { data: incident, error: incidentError } = await supabase
      .from('conflict_incidents')
      .select('*, relationships!inner(*)')
      .eq('id', incidentId)
      .single();

    if (incidentError || !incident) {
      return NextResponse.json(
        { error: 'Incident not found' },
        { status: 404 }
      );
    }

    // Verify user is part of this relationship
    const relationship = (incident as any).relationships;
    if (relationship.partner_a_id !== user.id && relationship.partner_b_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not part of this relationship' },
        { status: 403 }
      );
    }

    // Get both intake responses
    const { data: intakes, error: intakesError } = await supabase
      .from('conflict_intake_responses')
      .select('*')
      .eq('incident_id', incidentId)
      .order('created_at');

    if (intakesError || !intakes || intakes.length !== 2) {
      return NextResponse.json(
        { error: 'Both partners must complete intake before evaluation' },
        { status: 400 }
      );
    }

    const partnerAIntake = intakes.find(i => i.responder_role === 'partner_a');
    const partnerBIntake = intakes.find(i => i.responder_role === 'partner_b');

    if (!partnerAIntake || !partnerBIntake) {
      return NextResponse.json(
        { error: 'Intake data incomplete' },
        { status: 400 }
      );
    }

    // Get partner profiles for conflict resolution preferences
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, conflict_resolution_preferences')
      .in('id', [relationship.partner_a_id, relationship.partner_b_id]);

    const partnerAProfile = profiles?.find(p => p.id === relationship.partner_a_id);
    const partnerBProfile = profiles?.find(p => p.id === relationship.partner_b_id);

    // Get conflict history for this relationship
    const { data: pastIncidents } = await supabase
      .from('conflict_incidents')
      .select('status, resolution_outcome, created_at')
      .eq('relationship_id', relationship.id)
      .neq('id', incidentId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Call AI for safety evaluation
    const evaluation = await generateSafetyEvaluation({
      partnerAIntake,
      partnerBIntake,
      partnerAProfile,
      partnerBProfile,
      pastIncidents: pastIncidents || [],
      relationshipDuration: relationship.duration_months
    });

    // Save evaluation to database
    const { data: savedEvaluation, error: evalError } = await supabase
      .from('conflict_safety_evaluations')
      .insert({
        incident_id: incidentId,
        safety_level: evaluation.safety_level,
        risk_flags: evaluation.risk_flags,
        primary_recommendation: evaluation.primary_recommendation,
        alternative_options: evaluation.alternative_options,
        personalization_factors: evaluation.personalization_factors,
        evaluation_reasoning: evaluation.evaluation_reasoning,
        professional_help_resources: evaluation.professional_help_resources,
        recommended_break_duration: evaluation.recommended_break_duration
      })
      .select()
      .single();

    if (evalError || !savedEvaluation) {
      console.error('Error saving evaluation:', evalError);
      return NextResponse.json(
        { error: 'Failed to save evaluation' },
        { status: 500 }
      );
    }

    // Update incident status based on recommendation
    let newStatus: string;
    switch (evaluation.primary_recommendation) {
      case 'crisis_resources':
      case 'professional_help':
        newStatus = 'recommend_professional_help';
        break;
      case 'take_break':
        newStatus = 'recommend_break';
        break;
      case 'solo_conversations':
        newStatus = 'solo_conversations';
        break;
      case 'joint_mediation':
        newStatus = 'joint_mediation_ready';
        break;
      default:
        newStatus = 'safety_evaluation';
    }

    await supabase
      .from('conflict_incidents')
      .update({ status: newStatus })
      .eq('id', incidentId);

    // Notify both partners that evaluation is ready
    await supabase.rpc('create_notification', {
      p_user_id: relationship.partner_a_id,
      p_type: 'evaluation_ready',
      p_title: 'Your recommendation is ready',
      p_message: 'Eros has analyzed both perspectives and created a personalized recommendation for your next step.',
      p_related_type: 'conflict_incident',
      p_related_id: incidentId,
      p_action_url: `/mediation/recommendation/${incidentId}`,
      p_action_label: 'View Recommendation'
    });

    await supabase.rpc('create_notification', {
      p_user_id: relationship.partner_b_id,
      p_type: 'evaluation_ready',
      p_title: 'Your recommendation is ready',
      p_message: 'Eros has analyzed both perspectives and created a personalized recommendation for your next step.',
      p_related_type: 'conflict_incident',
      p_related_id: incidentId,
      p_action_url: `/mediation/recommendation/${incidentId}`,
      p_action_label: 'View Recommendation'
    });

    const response: GetEvaluationResponse = {
      evaluation: savedEvaluation as ConflictSafetyEvaluation
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in safety evaluation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: incidentId } = await params;

    // Get evaluation
    const { data: evaluation, error: evalError } = await supabase
      .from('conflict_safety_evaluations')
      .select('*, conflict_incidents!inner(*, relationships!inner(*))')
      .eq('incident_id', incidentId)
      .single();

    if (evalError || !evaluation) {
      return NextResponse.json(
        { error: 'Evaluation not found' },
        { status: 404 }
      );
    }

    // Verify user is part of this relationship
    const incident = (evaluation as any).conflict_incidents;
    const relationship = incident.relationships;
    if (relationship.partner_a_id !== user.id && relationship.partner_b_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this evaluation' },
        { status: 403 }
      );
    }

    const response: GetEvaluationResponse = {
      evaluation: evaluation as ConflictSafetyEvaluation
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching evaluation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateSafetyEvaluation({
  partnerAIntake,
  partnerBIntake,
  partnerAProfile,
  partnerBProfile,
  pastIncidents,
  relationshipDuration
}: {
  partnerAIntake: any;
  partnerBIntake: any;
  partnerAProfile: any;
  partnerBProfile: any;
  pastIncidents: any[];
  relationshipDuration?: number;
}): Promise<{
  safety_level: SafetyLevel;
  risk_flags: RiskFlag[];
  primary_recommendation: RecommendedAction;
  alternative_options: RecommendedAction[];
  personalization_factors: PersonalizationFactors;
  evaluation_reasoning: string;
  professional_help_resources?: any;
  recommended_break_duration?: string;
}> {
  const prompt = `You are a safety evaluator for relationship conflicts. Analyze the following intake data from both partners and generate a personalized recommendation.

PARTNER A INTAKE:
- Intensity (1-10): ${partnerAIntake.intensity_rating}
- How triggered (1-10): ${partnerAIntake.how_triggered}
- Urgency (1-10): ${partnerAIntake.urgency_to_resolve}
- Frequency: ${partnerAIntake.if_yes_how_often || 'first_time'}
- Emotions: ${partnerAIntake.current_emotional_state.join(', ')}
- Physical safety concern: ${partnerAIntake.physical_safety_concern}
- Emotional safety concern: ${partnerAIntake.emotional_safety_concern}
- Relationship thoughts: ${partnerAIntake.thoughts_of_ending_relationship}
- Substance involved: ${partnerAIntake.substance_involved}
- Preferred next step: ${partnerAIntake.preferred_next_step.join(', ')}
- What they need: ${partnerAIntake.what_you_need_right_now || 'not specified'}

PARTNER B INTAKE:
- Intensity (1-10): ${partnerBIntake.intensity_rating}
- How triggered (1-10): ${partnerBIntake.how_triggered}
- Urgency (1-10): ${partnerBIntake.urgency_to_resolve}
- Frequency: ${partnerBIntake.if_yes_how_often || 'first_time'}
- Emotions: ${partnerBIntake.current_emotional_state.join(', ')}
- Physical safety concern: ${partnerBIntake.physical_safety_concern}
- Emotional safety concern: ${partnerBIntake.emotional_safety_concern}
- Relationship thoughts: ${partnerBIntake.thoughts_of_ending_relationship}
- Substance involved: ${partnerBIntake.substance_involved}
- Preferred next step: ${partnerBIntake.preferred_next_step.join(', ')}
- What they need: ${partnerBIntake.what_you_need_right_now || 'not specified'}

PERSONALITY PREFERENCES (from onboarding):
- Partner A typically prefers: ${partnerAProfile?.conflict_resolution_preferences?.join(', ') || 'not specified'}
- Partner B typically prefers: ${partnerBProfile?.conflict_resolution_preferences?.join(', ') || 'not specified'}

CONFLICT HISTORY:
- Past incidents (last 30 days): ${pastIncidents.length}
- Relationship duration: ${relationshipDuration ? `${relationshipDuration} months` : 'unknown'}

EVALUATION CRITERIA:

🚨 CRISIS (immediate crisis resources):
- Physical safety concerns reported
- Mentions of violence, threats, or harm
- Active substance use + high intensity

⚠️ HIGH CONCERN (professional help):
- Frequent thoughts of ending relationship
- Chronic high-intensity pattern (weekly 7+ intensity)
- Emotional abuse indicators
- Extreme emotional distress

⚠️ MODERATE CONCERN (break or solo work):
- Both intensity 7-8 (needs cooling off → break)
- Emotional safety concerns (needs processing → solo)
- Chronic moderate pattern (weekly 5-6 → solo)

✅ SAFE (proceed to joint mediation):
- No major safety flags
- Intensity < 7
- Both emotionally ready

PERSONALIZATION LAYER:
Consider personality preferences, current state, urgency, and history to determine:
1. PRIMARY RECOMMENDATION (what you think is best)
2. ALTERNATIVE OPTIONS (what else they could choose)
3. WHY this recommendation (transparent reasoning)

OUTPUT FORMAT (JSON):
{
  "safety_level": "crisis | high_concern | moderate_concern | safe",
  "risk_flags": ["array of specific flags"],
  "primary_recommendation": "crisis_resources | professional_help | take_break | solo_conversations | joint_mediation",
  "alternative_options": ["array of alternatives - NEVER include joint_mediation if crisis/high_concern"],
  "personalization_factors": {
    "safety_factors": ["list safety considerations"],
    "personality_factors": ["list personality preferences considered"],
    "history_factors": ["list historical patterns"],
    "current_state_factors": ["list current emotional state"],
    "user_preferences": ["list what users said they want"]
  },
  "evaluation_reasoning": "User-friendly 2-3 sentence explanation of WHY this recommendation",
  "recommended_break_duration": "24_hours | 48_hours | null",
  "professional_help_resources": null or {
    "crisis_lines": [...],
    "therapist_directories": [...],
    "why_professional_help": "explanation"
  }
}

Be conservative with safety. When in doubt, recommend a higher level of support.`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = response.content[0].type === 'text'
    ? response.content[0].text
    : '';

  // Parse JSON response
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse AI evaluation response');
  }

  const evaluation = JSON.parse(jsonMatch[0]);

  // Add default professional help resources if needed
  if (evaluation.primary_recommendation === 'crisis_resources' || evaluation.primary_recommendation === 'professional_help') {
    evaluation.professional_help_resources = evaluation.professional_help_resources || {
      crisis_lines: [
        { name: 'National Domestic Violence Hotline', phone: '1-800-799-7233', text: 'Text START to 88788', hours: '24/7' },
        { name: 'National Suicide Prevention Lifeline', phone: '988', hours: '24/7' },
        { name: 'Crisis Text Line', text: 'Text HELLO to 741741', hours: '24/7' }
      ],
      therapist_directories: [
        { name: 'Psychology Today', url: 'https://www.psychologytoday.com/us/therapists', description: 'Find local therapists' },
        { name: 'BetterHelp', url: 'https://www.betterhelp.com', description: 'Online therapy platform' }
      ]
    };
  }

  return evaluation;
}

import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type {
  SubmitIntakeRequest,
  SubmitIntakeResponse,
  ConflictIntakeResponse
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

    // Parse request body
    const body: SubmitIntakeRequest = await request.json();

    // Validate required fields
    const requiredFields: (keyof SubmitIntakeRequest)[] = [
      'what_happened',
      'intensity_rating',
      'has_happened_before',
      'current_emotional_state',
      'physical_safety_concern',
      'emotional_safety_concern',
      'need_immediate_break',
      'thoughts_of_ending_relationship',
      'substance_involved',
      'urgency_to_resolve',
      'how_triggered',
      'preferred_next_step'
    ];

    for (const field of requiredFields) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json(
          { error: `${field} is required` },
          { status: 400 }
        );
      }
    }

    // Get the incident
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

    // Determine responder role
    const responderRole = relationship.partner_a_id === user.id ? 'partner_a' : 'partner_b';

    // Check if user already submitted intake for this incident
    const { data: existingIntake } = await supabase
      .from('conflict_intake_responses')
      .select('id')
      .eq('incident_id', incidentId)
      .eq('responder_id', user.id)
      .single();

    if (existingIntake) {
      return NextResponse.json(
        { error: 'You have already submitted intake for this incident' },
        { status: 400 }
      );
    }

    // Create intake response
    const { data: intakeResponse, error: intakeError } = await supabase
      .from('conflict_intake_responses')
      .insert({
        incident_id: incidentId,
        responder_id: user.id,
        responder_role: responderRole,
        ...body
      })
      .select()
      .single();

    if (intakeError || !intakeResponse) {
      console.error('Error creating intake response:', intakeError);
      return NextResponse.json(
        { error: 'Failed to create intake response' },
        { status: 500 }
      );
    }

    // Generate AI summary for the other partner (if this is first intake)
    const { data: existingIntakes } = await supabase
      .from('conflict_intake_responses')
      .select('id')
      .eq('incident_id', incidentId);

    const isFirstIntake = !existingIntakes || existingIntakes.length === 1; // Only this person's intake exists

    if (isFirstIntake) {
      // Generate de-escalatory summary and conflict name
      const { summary, conflictName } = await generateDeEscalatorySummary({
        what_happened: body.what_happened,
        intensity_rating: body.intensity_rating,
        current_emotional_state: body.current_emotional_state,
        has_happened_before: body.has_happened_before,
        if_yes_how_often: body.if_yes_how_often,
        what_you_need_right_now: body.what_you_need_right_now,
        responderRole
      });

      // Update incident with summary and conflict name
      const summaryField = responderRole === 'partner_a'
        ? 'partner_a_summary_for_partner_b'
        : 'partner_b_summary_for_partner_a';

      await supabase
        .from('conflict_incidents')
        .update({
          [summaryField]: summary,
          conflict_name: conflictName,
          partner_a_intake_completed_at: responderRole === 'partner_a' ? new Date().toISOString() : undefined,
          partner_b_intake_completed_at: responderRole === 'partner_b' ? new Date().toISOString() : undefined
        })
        .eq('id', incidentId);
    } else {
      // Second partner - just update timestamp
      const updateField = responderRole === 'partner_a'
        ? 'partner_a_intake_completed_at'
        : 'partner_b_intake_completed_at';

      await supabase
        .from('conflict_incidents')
        .update({ [updateField]: new Date().toISOString() })
        .eq('id', incidentId);
    }

    // Create solo conversation for this user
    const { data: soloConversation, error: soloError } = await supabase
      .from('solo_conversations')
      .insert({
        user_id: user.id,
        relationship_id: relationship.id,
        incident_id: incidentId,
        conversation_type: 'conflict_processing',
        status: 'active'
      })
      .select()
      .single();

    if (soloError || !soloConversation) {
      console.error('Error creating solo conversation:', soloError);
      return NextResponse.json(
        { error: 'Failed to create solo conversation' },
        { status: 500 }
      );
    }

    // Check if both partners have completed intake
    const { data: bothIntakes } = await supabase
      .from('conflict_intake_responses')
      .select('responder_role')
      .eq('incident_id', incidentId);

    const partnerId = relationship.partner_a_id === user.id
      ? relationship.partner_b_id
      : relationship.partner_a_id;

    if (bothIntakes && bothIntakes.length === 2) {
      // Both partners completed - trigger safety evaluation
      await supabase
        .from('conflict_incidents')
        .update({ status: 'safety_evaluation' })
        .eq('id', incidentId);

      // Notify both partners that evaluation is running
      await supabase.rpc('create_notification', {
        p_user_id: user.id,
        p_type: 'both_intakes_complete',
        p_title: 'Eros is evaluating your conflict',
        p_message: 'Both of you have completed the intake. Eros is now analyzing your responses to provide a personalized recommendation.',
        p_related_type: 'conflict_incident',
        p_related_id: incidentId,
        p_action_url: `/mediation/recommendation/${incidentId}`,
        p_action_label: 'View Recommendation'
      });

      await supabase.rpc('create_notification', {
        p_user_id: partnerId,
        p_type: 'both_intakes_complete',
        p_title: 'Eros is evaluating your conflict',
        p_message: 'Both of you have completed the intake. Eros is now analyzing your responses to provide a personalized recommendation.',
        p_related_type: 'conflict_incident',
        p_related_id: incidentId,
        p_action_url: `/mediation/recommendation/${incidentId}`,
        p_action_label: 'View Recommendation'
      });
    } else {
      // Only one partner completed - notify the other partner
      await supabase.rpc('create_notification', {
        p_user_id: partnerId,
        p_type: 'partner_intake_complete',
        p_title: 'Your partner completed their intake',
        p_message: 'Your partner has shared their perspective. It\'s your turn to complete the intake form.',
        p_related_type: 'conflict_incident',
        p_related_id: incidentId,
        p_action_url: `/mediation/start?incident=${incidentId}`,
        p_action_label: 'Complete Your Intake'
      });
    }

    const response: SubmitIntakeResponse = {
      intake_id: intakeResponse.id,
      next_step: 'solo_conversation',
      solo_conversation_id: soloConversation.id
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in submit intake:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateDeEscalatorySummary({
  what_happened,
  intensity_rating,
  current_emotional_state,
  has_happened_before,
  if_yes_how_often,
  what_you_need_right_now,
  responderRole
}: {
  what_happened: string;
  intensity_rating: number;
  current_emotional_state: string[];
  has_happened_before: boolean;
  if_yes_how_often?: string;
  what_you_need_right_now?: string;
  responderRole: string;
}): Promise<{ summary: string; conflictName: string }> {
  const prompt = `You are Eros, an AI couples mediator trained in de-escalation and Emotionally Focused Therapy (EFT).

One partner has just shared their perspective on a conflict. Your job is to:
1. Create a NEUTRAL, DE-ESCALATORY SUMMARY of what happened (for the other partner to read)
2. Generate a SHORT CONFLICT NAME that's neutral and non-blaming

PARTNER'S RAW PERSPECTIVE:
"${what_happened}"

EMOTIONAL STATE: ${current_emotional_state.join(', ')}
INTENSITY: ${intensity_rating}/10
FREQUENCY: ${has_happened_before ? (if_yes_how_often || 'has happened before') : 'first time'}
WHAT THEY NEED: ${what_you_need_right_now || 'not specified'}

YOUR TASK:

1. **DE-ESCALATORY SUMMARY** (for the other partner):
   - Strip out blame, accusations, and inflammatory language
   - Focus on OBSERVABLE BEHAVIORS and FACTS, not character judgments
   - Remove absolute words like "always", "never", "you're so..."
   - Don't assume accusations are true - present them as this partner's experience
   - Keep it brief (2-4 sentences max)
   - Make it specific enough for the other partner to know WHICH incident this is
   - Use neutral, mediator language

   BAD: "You always ignore me and never listen to what I say"
   GOOD: "There was a situation where one partner felt unheard during a conversation"

   BAD: "He's a selfish jerk who only thinks about himself"
   GOOD: "One partner felt their needs weren't being considered in a recent decision"

2. **CONFLICT NAME** (neutral, 5-8 words max):
   - Should be descriptive but neutral
   - NO blame or character attacks
   - Examples: "Communication about household responsibilities", "Different perspectives on social plans", "Navigating differing needs for connection"

DO NOT REVEAL IN THE SUMMARY:
- Thoughts of ending the relationship
- Safety concerns
- Substance use
- Anything deeply vulnerable that should stay private

OUTPUT FORMAT (JSON):
{
  "summary": "2-4 sentence de-escalatory summary here",
  "conflictName": "Short neutral name for the conflict"
}

Be compassionate but NEUTRAL. Your goal is to help the other partner understand what happened WITHOUT making them defensive.`;

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-20250514',
    max_tokens: 512,
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
    // Fallback if AI doesn't return proper JSON
    return {
      summary: "One partner shared their perspective on a situation that arose between you both.",
      conflictName: "Recent situation"
    };
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return {
    summary: parsed.summary || "One partner shared their perspective on a situation that arose between you both.",
    conflictName: parsed.conflictName || "Recent situation"
  };
}

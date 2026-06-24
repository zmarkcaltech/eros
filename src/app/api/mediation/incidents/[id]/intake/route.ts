import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type {
  SubmitIntakeRequest,
  SubmitIntakeResponse,
  ConflictIntakeResponse
} from '@/types/mediation';

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

    // Update incident with completion timestamp
    const updateField = responderRole === 'partner_a'
      ? 'partner_a_intake_completed_at'
      : 'partner_b_intake_completed_at';

    await supabase
      .from('conflict_incidents')
      .update({ [updateField]: new Date().toISOString() })
      .eq('id', incidentId);

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

    if (bothIntakes && bothIntakes.length === 2) {
      // Both partners completed - trigger safety evaluation
      await supabase
        .from('conflict_incidents')
        .update({ status: 'safety_evaluation' })
        .eq('id', incidentId);

      // TODO: Trigger safety evaluation (will implement in next step)
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

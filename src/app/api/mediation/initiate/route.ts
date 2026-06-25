import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { InitiateMediationRequest, InitiateMediationResponse } from '@/types/mediation';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body: InitiateMediationRequest = await request.json();
    const { relationship_id } = body;

    if (!relationship_id) {
      return NextResponse.json(
        { error: 'relationship_id is required' },
        { status: 400 }
      );
    }

    // Verify user is part of this relationship
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select('*')
      .eq('id', relationship_id)
      .single();

    if (relError || !relationship) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      );
    }

    if (relationship.partner_a_id !== user.id && relationship.partner_b_id !== user.id) {
      return NextResponse.json(
        { error: 'You are not part of this relationship' },
        { status: 403 }
      );
    }

    if (relationship.status !== 'active') {
      return NextResponse.json(
        { error: 'Relationship is not active' },
        { status: 400 }
      );
    }

    // Create conflict incident
    const { data: incident, error: incidentError } = await supabase
      .from('conflict_incidents')
      .insert({
        relationship_id,
        initiated_by: user.id,
        status: 'awaiting_partner_intake'
      })
      .select()
      .single();

    if (incidentError || !incident) {
      console.error('Error creating incident:', incidentError);
      return NextResponse.json(
        { error: 'Failed to create conflict incident' },
        { status: 500 }
      );
    }

    // Notify partner that mediation has been initiated
    const partnerId = relationship.partner_a_id === user.id
      ? relationship.partner_b_id
      : relationship.partner_a_id;

    const { data: notifResult, error: notifError } = await supabase.rpc('create_notification', {
      p_user_id: partnerId,
      p_type: 'mediation_initiated',
      p_title: 'Your partner started mediation',
      p_message: 'Your partner has initiated a mediation session. Please complete your intake form when you\'re ready.',
      p_related_type: 'conflict_incident',
      p_related_id: incident.id,
      p_action_url: `/mediation/start?incident=${incident.id}`,
      p_action_label: 'Complete Intake'
    });

    if (notifError) {
      console.error('Error creating notification:', notifError);
    } else {
      console.log('Created notification for partner:', partnerId, 'notification ID:', notifResult);
    }

    const response: InitiateMediationResponse = {
      incident_id: incident.id,
      status: 'awaiting_partner_intake',
      next_step: 'partner_a_intake'
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in initiate mediation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import RecommendationClient from './RecommendationClient';

export default async function RecommendationPage({
  params
}: {
  params: { incidentId: string };
}) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirectTo=/mediation/recommendation/' + params.incidentId);
  }

  // Get incident details
  const { data: incident, error: incidentError } = await supabase
    .from('conflict_incidents')
    .select('*, relationships!inner(*)')
    .eq('id', params.incidentId)
    .single();

  if (incidentError || !incident) {
    redirect('/dashboard');
  }

  const relationship = (incident as any).relationships;

  // Verify user is part of this relationship
  if (relationship.partner_a_id !== user.id && relationship.partner_b_id !== user.id) {
    redirect('/dashboard');
  }

  // Check if both partners have submitted intake
  const { data: intakes, error: intakesError } = await supabase
    .from('conflict_intake_responses')
    .select('responder_id')
    .eq('incident_id', params.incidentId);

  if (!intakes || intakes.length < 2) {
    // Not ready for recommendation yet - redirect to waiting page or solo conversation
    const { data: soloConv } = await supabase
      .from('solo_conversations')
      .select('id')
      .eq('incident_id', params.incidentId)
      .eq('user_id', user.id)
      .single();

    if (soloConv) {
      redirect(`/mediation/solo/${soloConv.id}`);
    } else {
      redirect('/dashboard');
    }
  }

  // Try to get existing evaluation
  const { data: existingEvaluation } = await supabase
    .from('conflict_safety_evaluations')
    .select('*')
    .eq('incident_id', params.incidentId)
    .single();

  return (
    <RecommendationClient
      incidentId={params.incidentId}
      initialEvaluation={existingEvaluation}
      relationshipId={relationship.id}
    />
  );
}

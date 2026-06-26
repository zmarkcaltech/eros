import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import IntakeFormClient from './IntakeFormClient';

export default async function MediationStartPage({
  searchParams
}: {
  searchParams: Promise<{ incident?: string }>;
}) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirectTo=/mediation/start');
  }

  const { incident: incidentId } = await searchParams;
  if (!incidentId) {
    redirect('/dashboard');
  }

  // Get incident details
  const { data: incident, error } = await supabase
    .from('conflict_incidents')
    .select('*, relationships!inner(*)')
    .eq('id', incidentId)
    .single();

  if (error || !incident) {
    redirect('/dashboard');
  }

  const relationship = (incident as any).relationships;

  // Verify user is part of this relationship
  if (relationship.partner_a_id !== user.id && relationship.partner_b_id !== user.id) {
    redirect('/dashboard');
  }

  // Check if user already submitted intake
  const { data: existingIntake } = await supabase
    .from('conflict_intake_responses')
    .select('id')
    .eq('incident_id', incidentId)
    .eq('responder_id', user.id)
    .single();

  if (existingIntake) {
    // Already submitted, redirect to solo conversation
    const { data: soloConv } = await supabase
      .from('solo_conversations')
      .select('id')
      .eq('incident_id', incidentId)
      .eq('user_id', user.id)
      .single();

    if (soloConv) {
      redirect(`/mediation/solo/${soloConv.id}`);
    }
  }

  // Check if partner has already submitted intake
  const partnerId = relationship.partner_a_id === user.id
    ? relationship.partner_b_id
    : relationship.partner_a_id;

  const { data: partnerIntake } = await supabase
    .from('conflict_intake_responses')
    .select('what_happened, intensity_rating, current_emotional_state, has_happened_before, if_yes_how_often, what_you_need_right_now, urgency_to_resolve, how_triggered')
    .eq('incident_id', incidentId)
    .eq('responder_id', partnerId)
    .single();

  // Get partner's name
  const { data: partnerProfile } = await supabase
    .from('profiles')
    .select('preferred_name, full_name')
    .eq('id', partnerId)
    .single();

  const partnerName = partnerProfile?.preferred_name || partnerProfile?.full_name || 'your partner';

  return (
    <IntakeFormClient
      incidentId={incidentId}
      relationshipId={relationship.id}
      partnerIntake={partnerIntake || undefined}
      partnerName={partnerName}
    />
  );
}

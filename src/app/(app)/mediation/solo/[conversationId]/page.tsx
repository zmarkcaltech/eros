import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SoloConversationClient from './SoloConversationClient';

export default async function SoloConversationPage({
  params
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const supabase = await createClient();
  const { conversationId } = await params;

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirectTo=/mediation/solo/' + conversationId);
  }

  // Get the solo conversation
  const { data: conversation, error } = await supabase
    .from('solo_conversations')
    .select('*, profiles!inner(*)')
    .eq('id', conversationId)
    .single();

  if (error || !conversation) {
    redirect('/dashboard');
  }

  // Verify user owns this conversation
  if ((conversation as any).user_id !== user.id) {
    redirect('/dashboard');
  }

  // Get intake data for this incident
  const { data: intakeData } = await supabase
    .from('conflict_intake_responses')
    .select('*')
    .eq('incident_id', (conversation as any).incident_id)
    .eq('responder_id', user.id)
    .single();

  // Get messages
  const { data: messages } = await supabase
    .from('solo_conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  // If no messages yet, create an opening message from Eros
  if (!messages || messages.length === 0) {
    const profile = (conversation as any).profiles;
    const userName = profile.preferred_name || profile.full_name || 'there';

    const openingMessage = `Hi ${userName}, I'm here to help you process what happened and prepare for a productive conversation with your partner.

I've carefully reviewed your intake form. I can see you're feeling ${intakeData?.current_emotional_state?.join(', ') || 'strongly about this situation'}, and that this matters to you (intensity: ${intakeData?.intensity_rating}/10).

This is your private space - your partner cannot see this conversation. Let's work together to:
1. Process your emotions and calm down if needed
2. Identify what you truly need from your partner
3. Practice how to communicate those needs effectively
4. Understand what your partner might be feeling too

Before we dive in, how are you feeling right now in this moment?`;

    const { data: newMessage } = await supabase
      .from('solo_conversation_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        content: openingMessage,
        model_version: 'claude-opus-4-20250514',
        prompt_type: 'empathetic_listening'
      })
      .select()
      .single();

    return (
      <SoloConversationClient
        conversationId={conversationId}
        incidentId={(conversation as any).incident_id}
        initialMessages={newMessage ? [newMessage] : []}
        userName={userName}
        intakeData={intakeData}
      />
    );
  }

  const profile = (conversation as any).profiles;
  const userName = profile.preferred_name || profile.full_name || 'there';

  return (
    <SoloConversationClient
      conversationId={conversationId}
      incidentId={(conversation as any).incident_id}
      initialMessages={messages || []}
      userName={userName}
      intakeData={intakeData}
    />
  );
}

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

  // Get the conflict incident with relationship info
  const { data: incident } = await supabase
    .from('conflict_incidents')
    .select('*, relationships!inner(*)')
    .eq('id', (conversation as any).incident_id)
    .single();

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

    const openingMessage = `Hi ${userName}, I'm here to help you craft the perfect message to send to your partner.

I've reviewed your intake form. You're feeling ${intakeData?.current_emotional_state?.join(', ') || 'strongly about this'} (intensity: ${intakeData?.intensity_rating}/10), and I can see this really matters to you.

**My goal:** Help you compose specific text messages or conversation scripts that will help your partner actually HEAR you, without triggering defensiveness.

This is private - your partner won't see this conversation. We'll work together to:
1. Figure out what you truly need to communicate
2. Draft actual messages you can copy and send
3. Refine them until they feel authentic to you

Before we start drafting, tell me: How are you feeling right now, and what's the main thing you need your partner to understand?`;

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
        incident={incident}
        userId={user.id}
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
      incident={incident}
      userId={user.id}
    />
  );
}

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SoloConversationClient from './SoloConversationClient';

export default async function SoloConversationPage({
  params
}: {
  params: { conversationId: string };
}) {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirectTo=/mediation/solo/' + params.conversationId);
  }

  // Get the solo conversation
  const { data: conversation, error } = await supabase
    .from('solo_conversations')
    .select('*, profiles!inner(*)')
    .eq('id', params.conversationId)
    .single();

  if (error || !conversation) {
    redirect('/dashboard');
  }

  // Verify user owns this conversation
  if ((conversation as any).user_id !== user.id) {
    redirect('/dashboard');
  }

  // Get messages
  const { data: messages } = await supabase
    .from('solo_conversation_messages')
    .select('*')
    .eq('conversation_id', params.conversationId)
    .order('created_at', { ascending: true });

  // If no messages yet, create an opening message from Eros
  if (!messages || messages.length === 0) {
    const profile = (conversation as any).profiles;
    const userName = profile.preferred_name || profile.full_name || 'there';

    const openingMessage = `Hi ${userName}, I'm here to listen. Thank you for taking the time to share your perspective with me. This is a private space - your partner cannot see this conversation.

I've read what you shared in the intake form, and I can see this is important to you. Before we move forward, I want to make sure you have space to process your feelings.

How are you feeling right now?`;

    const { data: newMessage } = await supabase
      .from('solo_conversation_messages')
      .insert({
        conversation_id: params.conversationId,
        sender_type: 'ai',
        content: openingMessage,
        model_version: 'claude-opus-4-20250514',
        prompt_type: 'empathetic_listening'
      })
      .select()
      .single();

    return (
      <SoloConversationClient
        conversationId={params.conversationId}
        incidentId={(conversation as any).incident_id}
        initialMessages={newMessage ? [newMessage] : []}
        userName={userName}
      />
    );
  }

  const profile = (conversation as any).profiles;
  const userName = profile.preferred_name || profile.full_name || 'there';

  return (
    <SoloConversationClient
      conversationId={params.conversationId}
      incidentId={(conversation as any).incident_id}
      initialMessages={messages || []}
      userName={userName}
    />
  );
}

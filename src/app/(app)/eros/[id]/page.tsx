import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ErosConversationClient from '../ErosConversationClient';

export default async function ResumeErosConversationPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { id: conversationId } = await params;

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?redirectTo=/eros/${conversationId}`);
  }

  // Get the conversation
  const { data: conversation } = await supabase
    .from('eros_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single();

  if (!conversation) {
    // Conversation doesn't exist or doesn't belong to user
    redirect('/dashboard');
  }

  // Get messages
  const { data: messages } = await supabase
    .from('eros_conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  return (
    <ErosConversationClient
      initialConversation={conversation}
      initialMessages={messages || []}
    />
  );
}

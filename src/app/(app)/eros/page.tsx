import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import ErosConversationClient from './ErosConversationClient';

export default async function ErosConversationPage() {
  const supabase = await createClient();

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect('/login?redirectTo=/eros');
  }

  // Get user's active relationship
  const { data: relationship } = await supabase
    .from('relationships')
    .select('id')
    .or(`partner_a_id.eq.${user.id},partner_b_id.eq.${user.id}`)
    .eq('status', 'active')
    .single();

  // Get or create conversation
  let { data: conversation } = await supabase
    .from('eros_conversations')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!conversation) {
    // Create new conversation
    const { data: newConv } = await supabase
      .from('eros_conversations')
      .insert({
        user_id: user.id,
        relationship_id: relationship?.id || null,
        status: 'active'
      })
      .select()
      .single();

    conversation = newConv;
  }

  // Get messages
  const { data: messages } = await supabase
    .from('eros_conversation_messages')
    .select('*')
    .eq('conversation_id', conversation!.id)
    .order('created_at', { ascending: true });

  // If no messages, create opening message
  if (!messages || messages.length === 0) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_name, full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.preferred_name || profile?.full_name || 'there';

    const openingMessage = `Hi ${userName} 👋

I'm Eros, and I'm here to support you in your relationship journey. This is a safe, private space where we can talk about whatever's on your mind.

Before we dive in, I'd love to understand how I can best help you today. Take your time with this - there's no rush.

**To start, could you share: Has anything happened recently in your relationship that you'd like to talk about?**

(It could be something challenging, confusing, or even something positive you're working through together)`;

    const { data: newMessage } = await supabase
      .from('eros_conversation_messages')
      .insert({
        conversation_id: conversation!.id,
        sender_type: 'ai',
        content: openingMessage,
        model_version: 'claude-sonnet-4-5-20250929',
        prompt_type: 'discovery'
      })
      .select()
      .single();

    return (
      <ErosConversationClient
        initialConversation={conversation!}
        initialMessages={newMessage ? [newMessage] : []}
      />
    );
  }

  return (
    <ErosConversationClient
      initialConversation={conversation!}
      initialMessages={messages || []}
    />
  );
}

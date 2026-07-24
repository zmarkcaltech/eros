import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

// GET - Get or create conversation for current user
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
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
      .eq('relationship_id', relationship?.id || null)
      .single();

    if (!conversation) {
      // Create new conversation
      const { data: newConv, error: createError } = await supabase
        .from('eros_conversations')
        .insert({
          user_id: user.id,
          relationship_id: relationship?.id || null,
          status: 'active'
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating conversation:', createError);
        return NextResponse.json({ error: 'Failed to create conversation' }, { status: 500 });
      }

      conversation = newConv;
    }

    // Get messages
    const { data: messages } = await supabase
      .from('eros_conversation_messages')
      .select('*')
      .eq('conversation_id', conversation.id)
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
          conversation_id: conversation.id,
          sender_type: 'ai',
          content: openingMessage,
          model_version: 'claude-sonnet-4-5-20250929',
          prompt_type: 'discovery'
        })
        .select()
        .single();

      return NextResponse.json({
        conversation,
        messages: newMessage ? [newMessage] : []
      });
    }

    return NextResponse.json({
      conversation,
      messages: messages || []
    });
  } catch (error) {
    console.error('Error in GET /api/eros/conversation:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Send message and get AI response
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { conversation_id, content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'Message content required' }, { status: 400 });
    }

    // Get conversation with context
    const { data: conversation } = await supabase
      .from('eros_conversations')
      .select('*')
      .eq('id', conversation_id)
      .eq('user_id', user.id)
      .single();

    if (!conversation) {
      return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
    }

    // Get user profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('preferred_name, full_name')
      .eq('id', user.id)
      .single();

    const userName = profile?.preferred_name || profile?.full_name || 'there';

    // Save user message
    console.log('Saving user message for conversation:', conversation_id);
    const { data: userMessage, error: userMsgError } = await supabase
      .from('eros_conversation_messages')
      .insert({
        conversation_id: conversation_id,
        sender_type: 'user',
        content: content.trim()
      })
      .select()
      .single();

    if (userMsgError) {
      console.error('Error saving user message:', userMsgError);
      return NextResponse.json({ error: 'Failed to save user message' }, { status: 500 });
    }

    console.log('User message saved successfully');

    // Get conversation history
    const { data: messages } = await supabase
      .from('eros_conversation_messages')
      .select('*')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: true });

    // Build conversation history for AI
    const conversationHistory = messages?.map(msg => ({
      role: msg.sender_type === 'user' ? 'user' as const : 'assistant' as const,
      content: msg.content
    })) || [];

    // Determine conversation phase and build appropriate prompt
    const systemPrompt = buildErosPrompt({
      userName,
      conversation,
      messageCount: messages?.length || 0
    });

    // Call Claude
    console.log('Calling Claude API with', conversationHistory.length, 'messages');
    const aiResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversationHistory
    });

    const aiContent = aiResponse.content[0].type === 'text'
      ? aiResponse.content[0].text
      : '';

    console.log('AI response received, length:', aiContent.length);

    // Detect what we learned from this exchange and update conversation context
    const updates = await detectContextUpdates(content, aiContent, conversation);

    // Increment message count
    const newMessageCount = (conversation.message_count || 0) + 2; // user + ai message
    updates.message_count = newMessageCount;

    if (Object.keys(updates).length > 0) {
      console.log('Updating conversation context with:', updates);
      await supabase
        .from('eros_conversations')
        .update(updates)
        .eq('id', conversation_id);
    }

    // Auto-name conversation after 4 messages (2 exchanges)
    if (!conversation.auto_named && newMessageCount >= 4) {
      console.log('Auto-naming conversation after', newMessageCount, 'messages');
      generateConversationName(conversation_id, messages || [], supabase).catch(err =>
        console.error('Error auto-naming conversation:', err)
      );
    }

    // Save AI message
    console.log('Saving AI message');
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from('eros_conversation_messages')
      .insert({
        conversation_id: conversation_id,
        sender_type: 'ai',
        content: aiContent,
        model_version: 'claude-sonnet-4-5-20250929',
        prompt_type: determinePromptType(conversation, messages?.length || 0)
      })
      .select()
      .single();

    if (aiMsgError) {
      console.error('Error saving AI message:', aiMsgError);
      return NextResponse.json({ error: 'Failed to save AI message' }, { status: 500 });
    }

    console.log('AI message saved successfully');

    // Update last_message_at
    await supabase
      .from('eros_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversation_id);

    return NextResponse.json({
      user_message: userMessage,
      ai_message: aiMessage
    });
  } catch (error) {
    console.error('Error in POST /api/eros/conversation:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function buildErosPrompt({
  userName,
  conversation,
  messageCount
}: {
  userName: string;
  conversation: any;
  messageCount: number;
}): string {
  const baseContext = `You are Eros, an AI relationship counselor trained in Emotionally Focused Therapy (EFT).

You're having a private, supportive conversation with ${userName}. Your tone should be:
- Warm and empathetic
- Calm and grounding
- Non-judgmental
- Curious and genuinely interested

CONVERSATION CONTEXT:
${conversation.recent_events ? `- Recent events: ${conversation.recent_events}` : ''}
${conversation.conversation_goals?.length > 0 ? `- Their goals for this conversation: ${conversation.conversation_goals.join(', ')}` : ''}
${conversation.relationship_goals?.length > 0 ? `- Their relationship goals: ${conversation.relationship_goals.join(', ')}` : ''}
${conversation.safety_checked ? `- Safety checked: ${conversation.safety_concerns || 'No concerns'}` : ''}
${conversation.relevant_history ? `- Relevant history: ${conversation.relevant_history}` : ''}`;

  // Discovery phase (messages 1-6)
  if (messageCount < 6) {
    return `${baseContext}

CURRENT PHASE: DISCOVERY

You're learning about ${userName} and what brought them here today. Your goal is to naturally gather:

1. **Recent events** - What happened recently in their relationship
2. **Conversation goals** - What they hope to get from talking with you today
3. **Relationship goals** - What they want for their relationship moving forward
4. **Safety** - Are they emotionally and physically safe
5. **History** - Any relevant background (past patterns, trauma, family history)
6. **De-escalation preferences** - How they prefer to handle conflicts (direct vs. gentle, need time vs. talk now, etc.)

IMPORTANT GUIDELINES:
- Ask ONE question at a time, not a list
- Let the conversation flow naturally - don't interrogate
- Listen deeply and validate their feelings
- If they share something difficult, acknowledge it before moving on
- You don't need to gather all 6 things in order - follow their lead
- Keep responses 2-4 sentences (concise but warm)

After they answer, either:
- Ask a gentle follow-up question to go deeper
- Or move to the next discovery area if it feels natural`;
  }

  // Determine best approach based on what was learned
  const hasRecentEvent = !!conversation.recent_events;
  const needsMessageHelp = conversation.conversation_goals?.includes('find_right_words') ||
                           conversation.conversation_goals?.includes('communicate_better');
  const needsPerspectiveTaking = conversation.conversation_goals?.includes('understand_partner');
  const needsProcessing = conversation.conversation_goals?.includes('process_feelings');

  let phase = 'SUPPORTIVE CONVERSATION';
  let instructions = '';

  if (needsMessageHelp && hasRecentEvent) {
    phase = 'MESSAGE CRAFTING';
    instructions = `Help ${userName} find the right words to communicate with their partner.

YOUR APPROACH:
- Ask what they want their partner to understand
- Help them identify their primary emotion and need
- Draft 2-3 message options they can copy/send (use 📱 emoji format)
- Each option should use "I feel/I need" language, not "you always/you never"
- Offer different tones: vulnerable, direct, collaborative

📱 MESSAGE FORMAT:
📱 Option 1 (Vulnerable):
"[Draft message here]"

📱 Option 2 (Direct):
"[Draft message here]"`;
  } else if (needsPerspectiveTaking) {
    phase = 'PERSPECTIVE TAKING';
    instructions = `Help ${userName} understand their partner's perspective.

YOUR APPROACH:
- Explore what might be going on for their partner
- Consider attachment needs and secondary emotions
- Help them see the "cycle" (both are trying to get needs met)
- Reframe blame as "both people stuck in a pattern"
- Ask: "What do you think your partner might be feeling under their reaction?"`;
  } else if (needsProcessing) {
    phase = 'EMOTIONAL PROCESSING';
    instructions = `Help ${userName} process what happened.

YOUR APPROACH:
- Validate their emotions
- Help them identify primary emotions (hurt, fear, loneliness) vs. secondary (anger)
- Explore what this triggered for them
- Ask about attachment needs: "What did you need in that moment?"
- Help them calm down and gain clarity`;
  } else {
    instructions = `Continue supporting ${userName} with whatever they need.

YOUR APPROACH:
- Follow their lead
- Offer reflections and gentle questions
- Help them gain clarity
- If they seem stuck, offer to help them: prepare to talk to partner, understand partner's view, or process feelings`;
  }

  return `${baseContext}

CURRENT PHASE: ${phase}

${instructions}

GENERAL GUIDELINES:
- Keep responses 3-5 sentences (concise but warm)
- One question per response
- Validate before exploring
- If they mention safety concerns, prioritize that
- Don't give advice unless asked
- Focus on helping them discover their own answers`;
}

function determinePromptType(conversation: any, messageCount: number): string {
  if (messageCount < 6) return 'discovery';

  if (conversation.conversation_goals?.includes('find_right_words')) return 'message_drafting';
  if (conversation.conversation_goals?.includes('understand_partner')) return 'perspective_taking';
  if (conversation.conversation_goals?.includes('process_feelings')) return 'emotional_processing';

  return 'goal_setting';
}

async function detectContextUpdates(userMessage: string, aiResponse: string, conversation: any): Promise<any> {
  const updates: any = {};

  // Simple keyword detection for now - could be enhanced with AI
  const lower = userMessage.toLowerCase();

  // Check if safety was discussed
  if ((lower.includes('safe') || lower.includes('scared') || lower.includes('afraid')) && !conversation.safety_checked) {
    updates.safety_checked = true;
    if (lower.includes('not safe') || lower.includes('unsafe')) {
      updates.safety_concerns = userMessage.substring(0, 500);
    }
  }

  return updates;
}

async function generateConversationName(
  conversationId: string,
  messages: any[],
  supabase: any
): Promise<void> {
  try {
    // Get first few messages to understand the topic
    const relevantMessages = messages.slice(0, 6);
    const conversationSummary = relevantMessages
      .map(m => `${m.sender_type === 'user' ? 'User' : 'Eros'}: ${m.content}`)
      .join('\n\n');

    const prompt = `Based on this conversation, generate a SHORT, descriptive name (3-6 words max) that captures the main topic.

Conversation:
${conversationSummary}

Rules:
- 3-6 words maximum
- Descriptive but concise
- Examples: "Household chore disagreement", "Communication about intimacy", "Processing partner's behavior"
- NO quotes, NO punctuation at the end
- Focus on the TOPIC, not the emotion

Output ONLY the name, nothing else.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 50,
      messages: [{ role: 'user', content: prompt }]
    });

    const conversationName = response.content[0].type === 'text'
      ? response.content[0].text.trim().replace(/['"]/g, '')
      : 'Conversation with Eros';

    console.log('Generated conversation name:', conversationName);

    // Update conversation with name
    await supabase
      .from('eros_conversations')
      .update({
        conversation_name: conversationName,
        auto_named: true
      })
      .eq('id', conversationId);
  } catch (error) {
    console.error('Error generating conversation name:', error);
    // Fallback: use generic name
    await supabase
      .from('eros_conversations')
      .update({
        conversation_name: 'Conversation with Eros',
        auto_named: true
      })
      .eq('id', conversationId);
  }
}

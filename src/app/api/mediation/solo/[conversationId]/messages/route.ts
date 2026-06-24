import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import type {
  SendSoloMessageRequest,
  SendSoloMessageResponse,
  SoloConversationMessage
} from '@/types/mediation';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { conversationId } = await params;

    // Parse request body
    const body: SendSoloMessageRequest = await request.json();
    const { content } = body;

    if (!content || content.trim() === '') {
      return NextResponse.json(
        { error: 'Message content is required' },
        { status: 400 }
      );
    }

    // Get the solo conversation
    const { data: conversation, error: convError } = await supabase
      .from('solo_conversations')
      .select('*, profiles!inner(*), relationships!inner(*)')
      .eq('id', conversationId)
      .single();

    if (convError || !conversation) {
      return NextResponse.json(
        { error: 'Conversation not found' },
        { status: 404 }
      );
    }

    // Verify user owns this conversation
    if ((conversation as any).user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have access to this conversation' },
        { status: 403 }
      );
    }

    // Get conversation history
    const { data: messages } = await supabase
      .from('solo_conversation_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    // Save user message
    const { data: userMessage, error: userMsgError } = await supabase
      .from('solo_conversation_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'user',
        content: content.trim()
      })
      .select()
      .single();

    if (userMsgError || !userMessage) {
      console.error('Error saving user message:', userMsgError);
      return NextResponse.json(
        { error: 'Failed to save message' },
        { status: 500 }
      );
    }

    // Build conversation history for AI
    const conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }> =
      messages?.map(msg => ({
        role: msg.sender_type === 'user' ? 'user' as const : 'assistant' as const,
        content: msg.content
      })) || [];

    // Add current message
    conversationHistory.push({
      role: 'user',
      content: content.trim()
    });

    // Get user profile and relationship data for context
    const profile = (conversation as any).profiles;
    const relationship = (conversation as any).relationships;

    // Get intake data if linked to incident
    let intakeData = null;
    if ((conversation as any).incident_id) {
      const { data: intake } = await supabase
        .from('conflict_intake_responses')
        .select('*')
        .eq('incident_id', (conversation as any).incident_id)
        .eq('responder_id', user.id)
        .single();
      intakeData = intake;
    }

    // Build AI prompt (using EFT-based approach)
    const systemPrompt = buildSoloConversationPrompt({
      userName: profile.preferred_name || profile.full_name || 'there',
      conversationType: (conversation as any).conversation_type,
      intakeData,
      relationshipDuration: relationship.duration_months,
      relationshipGoals: relationship.relationship_goals
    });

    // Call Claude Opus 4
    const aiResponse = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: conversationHistory
    });

    const aiContent = aiResponse.content[0].type === 'text'
      ? aiResponse.content[0].text
      : '';

    // Save AI response
    const { data: aiMessage, error: aiMsgError } = await supabase
      .from('solo_conversation_messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        content: aiContent,
        model_version: 'claude-opus-4-20250514',
        prompt_type: 'empathetic_listening'
      })
      .select()
      .single();

    if (aiMsgError || !aiMessage) {
      console.error('Error saving AI message:', aiMsgError);
      return NextResponse.json(
        { error: 'Failed to save AI response' },
        { status: 500 }
      );
    }

    // Update last_message_at
    await supabase
      .from('solo_conversations')
      .update({ last_message_at: new Date().toISOString() })
      .eq('id', conversationId);

    const response: SendSoloMessageResponse = {
      user_message: userMessage as SoloConversationMessage,
      ai_response: aiMessage as SoloConversationMessage
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in solo conversation:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function buildSoloConversationPrompt({
  userName,
  conversationType,
  intakeData,
  relationshipDuration,
  relationshipGoals
}: {
  userName: string;
  conversationType: string;
  intakeData: any;
  relationshipDuration?: number;
  relationshipGoals?: string[];
}): string {
  const basePrompt = `You are Eros, an AI relationship mediator trained in Emotionally Focused Therapy (EFT).
You are currently in a PRIVATE conversation with ${userName}. Their partner CANNOT see this conversation.

CONTEXT:
- Conversation type: ${conversationType}
- Relationship duration: ${relationshipDuration ? `${relationshipDuration} months` : 'unknown'}
- Relationship goals: ${relationshipGoals?.join(', ') || 'not specified'}`;

  if (intakeData) {
    const conflictContext = `

CURRENT CONFLICT SITUATION:
- What happened: ${intakeData.what_happened}
- Intensity (1-10): ${intakeData.intensity_rating}
- How triggered (1-10): ${intakeData.how_triggered}
- Urgency (1-10): ${intakeData.urgency_to_resolve}
- Emotions: ${intakeData.current_emotional_state.join(', ')}
- What they need: ${intakeData.what_you_need_right_now || 'not specified'}`;

    return `${basePrompt}${conflictContext}

YOUR ROLE:
1. Validate ${userName}'s emotions without judgment (EFT: validation is key)
2. Help them identify underlying attachment needs beneath surface emotions
3. Coach them on expressing needs using "I feel... I need..." statements
4. Build empathy for their partner's potential perspective
5. Assess readiness for constructive conversation with partner

EFT PRINCIPLES:
- Emotions are signals about attachment needs
- Focus on "primary emotions" (hurt, fear, sadness) beneath "secondary emotions" (anger, frustration)
- Reframe conflicts as both partners trying to get needs met
- Explore the cycle: behavior → feeling → response → impact

TONE: Warm, empathetic, gentle, non-judgmental. Like a wise therapist who truly cares.

CONSTRAINTS:
- NEVER blame or side against the partner
- NEVER give advice unless explicitly asked
- NEVER rush them - let them process at their own pace
- If they express safety concerns, prioritize that immediately
- Keep responses concise and focused (2-4 sentences typically)`;
  }

  return `${basePrompt}

YOUR ROLE:
You are here to provide emotional support and guidance in a safe, private space.
Listen empathetically, validate feelings, and help ${userName} process their emotions and thoughts about their relationship.

TONE: Warm, empathetic, gentle, non-judgmental. Like a wise friend who truly cares.

CONSTRAINTS:
- Keep responses concise and focused (2-4 sentences typically)
- Ask open-ended questions to help them explore their feelings
- NEVER give advice unless explicitly asked
- Focus on emotional processing and self-reflection`;
}

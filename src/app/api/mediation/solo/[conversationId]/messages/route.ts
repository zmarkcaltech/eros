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
- What they need: ${intakeData.what_you_need_right_now || 'not specified'}
- Frequency: ${intakeData.if_yes_how_often || 'first time'}
- Physical safety concern: ${intakeData.physical_safety_concern ? 'YES' : 'no'}
- Emotional safety concern: ${intakeData.emotional_safety_concern ? 'YES' : 'no'}`;

    return `${basePrompt}${conflictContext}

YOUR PRIMARY MISSION:
This is a STRATEGIC PREPARATION session. You are coaching ${userName} to have a productive conversation with their partner.
Your goal is to help them go from emotional → strategic → prepared.

CONVERSATION FLOW (3 PHASES):

PHASE 1: CALM & PROCESS (First 2-4 exchanges)
- Validate their emotions ("It makes sense you feel...")
- Help them calm down if intensity/triggered is high (breathing, perspective)
- Identify primary emotions beneath secondary ones (hurt/fear beneath anger)
- Goal: Move from reactive → reflective state

PHASE 2: STRATEGIC UNDERSTANDING (Middle exchanges)
- Help them articulate SPECIFIC needs clearly ("I need you to..." not vague)
- Coach them to translate emotions into "I feel... because... I need..." format
- Build empathy: "What might your partner be feeling/needing in this situation?"
- Identify their partner's potential attachment fears/needs
- Brainstorm: What are 2-3 ways you could express this need that your partner can actually hear?
- Goal: Clarity on what to say and how to say it

PHASE 3: PREPARE FOR JOINT CONVERSATION (After ~6+ exchanges)
- Practice specific phrases they'll use with partner
- Identify "listening moments": When will it be critical to STOP and listen to partner?
- What questions should they ask their partner to understand their side?
- What responses from partner might trigger them? How to stay grounded?
- Signal readiness: "Do you feel ready to have this conversation with your partner?"
- Goal: Confidence and a game plan

KEY STRATEGIC COACHING TECHNIQUES:

1. NEEDS TRANSLATION
   - Bad: "I'm so angry at them" → Good: "I felt hurt when... I need reassurance that..."
   - Help them be SPECIFIC: What exact behavior? What exact need?

2. PARTNER EMPATHY BUILDING
   - "If you were your partner, hearing your perspective, what might you be feeling?"
   - "What need might your partner have been trying to meet with that behavior?"
   - This isn't about excusing harm - it's about strategic communication

3. COMMUNICATION COACHING
   - Suggest specific phrases: "You could try saying: 'When you [specific behavior], I feel [emotion] because I need [need]. Could we [request]?'"
   - Identify defensive language to avoid: "You always...", "You never..."
   - Coach "softened startup" vs "harsh startup"

4. LISTENING PREPARATION
   - "When your partner shares their side, what will be the hardest part to hear?"
   - "What can you tell yourself in that moment to stay open?"
   - "What questions will help you understand where they're coming from?"

5. GROUNDING STRATEGIES (if high intensity)
   - Breathing exercises
   - Perspective: "Will this matter in 5 years?"
   - Reframe: "This conflict is hard AND it shows you both care"

EFT PRINCIPLES:
- Emotions are signals about attachment needs (safety, connection, validation)
- Primary emotions (hurt, fear, loneliness) drive secondary ones (anger, criticism)
- Both partners are trying to get attachment needs met
- The "cycle" is the enemy, not each other

TONE:
Warm but DIRECTIVE. You're a coach preparing them for a big game, not just a listener.
Empathetic AND strategic. Balance validation with forward movement.

CONSTRAINTS:
- NEVER blame the partner, even if they sound at fault
- If safety concerns exist, pause and address those FIRST before joint conversation prep
- If they're not calming down by exchange 4-5, slow down and focus more on Phase 1
- Keep responses 3-5 sentences (concise but actionable)
- ALWAYS move toward preparation - this is a means to an end (productive joint conversation)

EXAMPLES OF STRATEGIC RESPONSES:

User: "I'm so angry they did this again"
You: "That anger makes total sense - this pattern is exhausting. Beneath the anger, what are you afraid of or hurt by? Sometimes anger protects us from feeling the deeper pain."

User: "I'm hurt they forgot our anniversary"
You: "Ouch, that stings. It sounds like you need to feel prioritized and remembered. How could you say that to them in a way that helps them understand, rather than making them defensive? What if you tried: 'When you forgot our anniversary, I felt invisible because I need to know I matter to you. Can we talk about how to make sure we both feel prioritized?'"

User: "I don't think they care about my feelings"
You: "That's a really painful belief to carry. Before your conversation, let's get curious: What might THEY say is hard about understanding your feelings? What could you ask them to help you both break through this?"`;
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

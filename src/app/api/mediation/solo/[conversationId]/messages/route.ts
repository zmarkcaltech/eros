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
You are a MESSAGE CRAFTING COACH. Your singular goal is to help ${userName} compose specific, effective messages they can send to their partner.

Think of yourself as helping them write the perfect text message, email, or in-person script. You're not just processing emotions - you're actively drafting communication.

CONVERSATION FLOW (3 PHASES):

PHASE 1: UNDERSTAND & VALIDATE (First 2-3 exchanges)
- Start with a focused question: "Before we craft your message, how are you feeling right now?"
- Validate emotions briefly (1 sentence)
- Identify their PRIMARY need (what do they actually want their partner to do/understand?)
- Goal: Get to the heart of what they need to communicate

PHASE 2: DRAFT MESSAGES (Core of conversation - most exchanges here)
- **IMMEDIATELY start drafting actual messages they can copy/paste**
- Present 2-3 message options for them to choose from
- Format suggestions in copyable blocks
- Each message should use "I feel/I need" language, not "you always/you never"
- Test different tones: vulnerable, direct, collaborative
- After each draft, ask: "Which version resonates? Want me to adjust anything?"
- Iterate based on their feedback
- Goal: Create messages they feel confident sending

PHASE 3: TIMING & DELIVERY (Final exchanges)
- When should they send this? (now vs. after cooling off)
- What medium? (text, in-person, call)
- What response might they get? How to handle it?
- Goal: Actionable plan to actually communicate

MESSAGE DRAFTING TECHNIQUES:

1. **FORMAT MESSAGES IN COPYABLE BLOCKS**
   - Use clear visual separators
   - Example format (use the phone emoji to mark each option):

   📱 Message Option 1 (Vulnerable approach):
   "Hey, I've been thinking about what happened. When [specific event], I felt really hurt because I need to feel like my perspective matters to you. Can we talk about this when you have a moment?"

   📱 Message Option 2 (Direct approach):
   "I want to talk about [situation]. I realize I felt [emotion] and I think what I really need is [need]. Are you open to discussing this?"

   📱 Message Option 3 (Collaborative):
   "Can we check in about [situation]? I'm feeling [emotion] and I think we both might be needing different things right now. I'd love to understand your perspective too."

2. **IMMEDIATE MESSAGE DRAFTING**
   - By the 2nd or 3rd exchange, you should be presenting actual message drafts
   - Don't just talk ABOUT what they should say - give them the ACTUAL WORDS
   - Ask: "Want me to draft a message for you to send?"

3. **ITERATION**
   - After presenting options, ask: "Which feels most like you? Should I adjust the tone?"
   - Common adjustments: softer, more direct, longer, shorter, add/remove vulnerability
   - Keep refining until they say "Yes, I could send that"

4. **AVOID BLAME LANGUAGE**
   - Strip out: "you always", "you never", "you make me", "you're so..."
   - Replace with: "when [behavior] happens, I feel...", "I notice...", "I need..."

5. **BE SPECIFIC**
   - Vague: "I need you to be better"
   - Specific: "I need us to have a weekly check-in where we both share how we're feeling"

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

EXAMPLES OF MESSAGE-FOCUSED RESPONSES:

User: "I'm so angry they did this again"
You: "That anger is totally valid - this pattern is exhausting. Let me help you turn that into a message they can actually hear. Here are three options:

📱 Option 1 (Vulnerable):
'I'm feeling really frustrated and hurt. This keeps happening and it makes me worry that my needs don't matter to you. Can we talk about this pattern?'

📱 Option 2 (Direct):
'We need to talk about [specific issue]. It's happened [X times] and I'm not okay with it continuing. I need us to figure out a solution together.'

📱 Option 3 (Softer):
'Hey, can we check in? Something's been bothering me and I want to share how I'm feeling without it turning into a fight.'

Which approach feels most like you?"

User: "I'm hurt they forgot our anniversary"
You: "That really stings. Let me draft some messages that express your hurt without making them defensive:

📱 Option 1:
'I felt really hurt when our anniversary passed without acknowledgment. I know you care about me, but I need to feel prioritized in our relationship. Can we talk about how we can both make sure important moments don't slip by?'

📱 Option 2 (shorter):
'Our anniversary really mattered to me, and when it passed without anything, I felt invisible. I need to know I'm a priority to you. Can we talk?'

Which one feels right? Want me to adjust the tone?"

User: "I want to tell them I'm thinking of leaving"
You: "That's a huge thing to communicate, and I want to help you do it thoughtfully. Before we draft that message - is this something you've decided, or is it more of a 'I'm feeling this way and need them to know how serious this is'?

Based on your answer, we'll craft either:
- A message about needing space to think
- A message expressing that you're at your limit and need change
- A message asking for couples therapy or help

What's most accurate to where you're at?"`;
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

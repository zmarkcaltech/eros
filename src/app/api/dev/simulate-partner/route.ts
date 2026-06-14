import { createClient as createServerClient } from '@supabase/supabase-js'
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic/client'
import { NextRequest, NextResponse } from 'next/server'

interface Message {
  sender_type: 'partner_a' | 'partner_b' | 'ai'
  content: string
  created_at: string
}

export async function POST(request: NextRequest) {
  try {
    const { relationshipId, partner, scenario, recentMessages } = await request.json()

    if (!relationshipId || !partner) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Use service role to bypass RLS for dev testing
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get relationship details with profiles
    const { data: relationship, error: relError } = await supabase
      .from('relationships')
      .select(`
        *,
        partner_a:profiles!relationships_partner_a_id_fkey(*),
        partner_b:profiles!relationships_partner_b_id_fkey(*)
      `)
      .eq('id', relationshipId)
      .single()

    if (relError || !relationship) {
      return NextResponse.json(
        { error: 'Relationship not found' },
        { status: 404 }
      )
    }

    // Determine which partner is speaking
    const speakingPartner = partner === 'partner_a' ? relationship.partner_a : relationship.partner_b
    const otherPartner = partner === 'partner_a' ? relationship.partner_b : relationship.partner_a

    // Build conversation history
    let conversationContext = ''
    if (recentMessages && recentMessages.length > 0) {
      conversationContext = recentMessages
        .map((msg: Message) => {
          if (msg.sender_type === 'ai') {
            return `AI Mediator: ${msg.content}`
          } else if (msg.sender_type === partner) {
            return `${speakingPartner.preferred_name || speakingPartner.full_name}: ${msg.content}`
          } else {
            return `${otherPartner.preferred_name || otherPartner.full_name}: ${msg.content}`
          }
        })
        .join('\n\n')
    }

    // Build personality context
    const personalityInfo = []
    if ((speakingPartner as any).personality) personalityInfo.push(`- Personality: ${(speakingPartner as any).personality}`)
    if ((speakingPartner as any).communication_style) personalityInfo.push(`- Communication style: ${(speakingPartner as any).communication_style}`)
    if ((speakingPartner as any).enthusiasm_level) personalityInfo.push(`- Enthusiasm level: ${(speakingPartner as any).enthusiasm_level}`)
    if ((speakingPartner as any).hidden_truth) personalityInfo.push(`- Hidden truth (not yet shared with partner): ${(speakingPartner as any).hidden_truth}`)

    // Generate realistic partner response
    const prompt = `You are simulating a realistic partner in a couples therapy chat.

**Partner Profile:**
- Name: ${speakingPartner.preferred_name || speakingPartner.full_name}
- Age: ${speakingPartner.age || 'unknown'}
- Pronouns: ${speakingPartner.pronouns || 'unknown'}
- Occupation: ${speakingPartner.occupation || 'unknown'}
- Self-description: ${speakingPartner.self_description || 'No description available'}
- Interests: ${speakingPartner.interests || 'unknown'}
${personalityInfo.length > 0 ? '\n' + personalityInfo.join('\n') : ''}

**Their Partner:**
- Name: ${otherPartner.preferred_name || otherPartner.full_name}
- Age: ${otherPartner.age || 'unknown'}

**Relationship Context:**
- Duration: ${relationship.duration_months ? `${Math.floor(relationship.duration_months / 12)} years, ${relationship.duration_months % 12} months` : 'unknown'}
- Description: ${relationship.relationship_description || 'No description'}
- Therapy goals: ${relationship.relationship_goals || 'No specific goals'}
${scenario ? `\n**Current Conflict/Topic:**\n${scenario}` : ''}

${conversationContext ? `**Recent Conversation:**\n${conversationContext}\n` : ''}

Generate a realistic, natural message that ${speakingPartner.preferred_name || speakingPartner.full_name} would send in this couples therapy chat.

Guidelines:
- Stay in character based on their personality, communication style, and enthusiasm level
- Be authentic and emotionally genuine
- Keep messages conversational (2-4 sentences typically)
- Match the enthusiasm level (low = brief/withdrawn, medium = balanced, high = engaged/expressive)
- Match the communication style (e.g., logical vs emotional, direct vs passive-aggressive)
- If there's a hidden truth, let it subtly influence your emotions/reactions but don't reveal it directly unless it feels natural
- Show vulnerability when appropriate
- Reference the scenario/conflict if provided
- React naturally to what the AI mediator or partner has said
- Use "I feel" statements when expressing emotions
- Avoid being overly dramatic or theatrical
- Sound like a real person texting their partner, not formal therapy speak

Return ONLY the message text, nothing else.`

    const response = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 500,
      temperature: 1.0,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const messageText = response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ message: messageText })
  } catch (error) {
    console.error('Error generating partner message:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to generate message: ${errorMessage}` },
      { status: 500 }
    )
  }
}

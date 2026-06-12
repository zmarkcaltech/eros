import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

interface Message {
  sender_type: 'partner_a' | 'partner_b' | 'ai_mediator'
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

    const supabase = await createClient()

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
          if (msg.sender_type === 'ai_mediator') {
            return `AI Mediator: ${msg.content}`
          } else if (msg.sender_type === partner) {
            return `${speakingPartner.preferred_name || speakingPartner.full_name}: ${msg.content}`
          } else {
            return `${otherPartner.preferred_name || otherPartner.full_name}: ${msg.content}`
          }
        })
        .join('\n\n')
    }

    // Generate realistic partner response
    const prompt = `You are simulating a realistic partner in a couples therapy chat.

**Partner Profile:**
- Name: ${speakingPartner.preferred_name || speakingPartner.full_name}
- Age: ${speakingPartner.age || 'unknown'}
- Pronouns: ${speakingPartner.pronouns || 'unknown'}
- Occupation: ${speakingPartner.occupation || 'unknown'}
- Self-description: ${speakingPartner.self_description || 'No description available'}
- Interests: ${speakingPartner.interests || 'unknown'}

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
- Stay in character based on their profile
- Be authentic and emotionally genuine
- Keep messages conversational (2-4 sentences typically)
- Show vulnerability when appropriate
- Reference the scenario/conflict if provided
- React naturally to what the AI mediator or partner has said
- Use "I feel" statements when expressing emotions
- Avoid being overly dramatic or theatrical
- Sound like a real person texting their partner, not formal therapy speak

Return ONLY the message text, nothing else.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
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

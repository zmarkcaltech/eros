import { anthropic, AGENT_CONFIG } from '@/lib/anthropic/client'
import { buildTherapistSystemPrompt, buildConversationContext } from '@/lib/anthropic/prompts'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/agent/respond - Generate AI response to latest partner message
export async function POST(request: NextRequest) {
  try {
    const { relationship_id } = await request.json()

    if (!relationship_id) {
      return NextResponse.json({ error: 'Relationship ID is required' }, { status: 400 })
    }

    // Use service role client to read all messages
    const supabase = createServiceClient()

    // Fetch relationship with partner profiles
    const { data: relationship, error: relationshipError } = await supabase
      .from('relationships')
      .select(`
        *,
        partner_a:profiles!relationships_partner_a_id_fkey(
          id,
          full_name,
          preferred_name,
          self_description,
          age,
          pronouns,
          occupation,
          interests
        ),
        partner_b:profiles!relationships_partner_b_id_fkey(
          id,
          full_name,
          preferred_name,
          self_description,
          age,
          pronouns,
          occupation,
          interests
        )
      `)
      .eq('id', relationship_id)
      .single()

    if (relationshipError || !relationship) {
      console.error('Relationship fetch error:', relationshipError)
      return NextResponse.json({ error: 'Relationship not found' }, { status: 404 })
    }

    // Check if relationship is active
    if (relationship.status !== 'active') {
      return NextResponse.json({ error: 'Relationship is not active' }, { status: 400 })
    }

    // Fetch all messages in conversation (last 100 for full context)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('relationship_id', relationship_id)
      .order('created_at', { ascending: true })
      .limit(100)

    if (messagesError) {
      console.error('Messages fetch error:', messagesError)
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 })
    }

    // Don't respond if the last message was from AI (prevent loops)
    if (messages && messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      if (lastMessage.sender_type === 'ai') {
        console.log('Last message was from AI, skipping response')
        return NextResponse.json({ success: true, skipped: true })
      }
    }

    // Build conversation context for Claude
    const claudeMessages = buildConversationContext(
      messages || [],
      relationship.partner_a,
      relationship.partner_b
    )

    console.log('Calling Claude API for relationship:', relationship_id)

    // Call Claude API
    const response = await anthropic.messages.create({
      model: AGENT_CONFIG.model,
      max_tokens: 2048, // Concise responses for ongoing chat
      temperature: AGENT_CONFIG.temperature,
      system: buildTherapistSystemPrompt(relationship),
      messages: claudeMessages
    })

    const aiContent = response.content[0].type === 'text' ? response.content[0].text : ''

    if (!aiContent) {
      return NextResponse.json({ error: 'No AI response generated' }, { status: 500 })
    }

    console.log('Claude API response received, storing message...')

    // Insert AI message
    const { error: messageError } = await supabase.from('messages').insert({
      relationship_id,
      sender_type: 'ai',
      sender_id: null,
      content: aiContent,
      model: response.model,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens
    })

    if (messageError) {
      console.error('AI message storage error:', messageError)
      return NextResponse.json({ error: 'Failed to store AI response' }, { status: 500 })
    }

    // Realtime handles notifying partners of AI response

    console.log('AI response generated successfully for relationship:', relationship_id)

    return NextResponse.json({
      success: true,
      tokens: response.usage.input_tokens + response.usage.output_tokens
    })
  } catch (error: any) {
    console.error('Generate AI response error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

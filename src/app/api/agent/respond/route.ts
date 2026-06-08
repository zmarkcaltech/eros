import { anthropic, AGENT_CONFIG } from '@/lib/anthropic/client'
import { buildTherapistSystemPrompt, buildConversationContext } from '@/lib/anthropic/prompts'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/agent/respond - Generate AI response to latest partner message
export async function POST(request: NextRequest) {
  try {
    const { conflict_id } = await request.json()

    if (!conflict_id) {
      return NextResponse.json({ error: 'Conflict ID is required' }, { status: 400 })
    }

    // Use service role client to read all messages
    const supabase = createServiceClient()

    // Fetch conflict with relationship and partner profiles
    const { data: conflict, error: conflictError } = await supabase
      .from('conflicts')
      .select(`
        *,
        relationships (
          *,
          partner_a:profiles!relationships_partner_a_id_fkey(
            id,
            full_name,
            self_description
          ),
          partner_b:profiles!relationships_partner_b_id_fkey(
            id,
            full_name,
            self_description
          )
        )
      `)
      .eq('id', conflict_id)
      .single()

    if (conflictError || !conflict) {
      console.error('Conflict fetch error:', conflictError)
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 })
    }

    // Check if conflict is active
    if (conflict.status !== 'active') {
      return NextResponse.json({ error: 'Conflict is not active' }, { status: 400 })
    }

    // Fetch all messages in conversation (last 50 for context window)
    const { data: messages, error: messagesError } = await supabase
      .from('messages')
      .select('*')
      .eq('conflict_id', conflict_id)
      .order('created_at', { ascending: true })
      .limit(50)

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
      conflict.relationships.partner_a,
      conflict.relationships.partner_b
    )

    console.log('Calling Claude API for conflict:', conflict_id)

    // Call Claude API
    const response = await anthropic.messages.create({
      model: AGENT_CONFIG.model,
      max_tokens: 2048, // Shorter responses for chat
      temperature: AGENT_CONFIG.temperature,
      system: buildTherapistSystemPrompt(conflict),
      messages: claudeMessages
    })

    const aiContent = response.content[0].type === 'text' ? response.content[0].text : ''

    if (!aiContent) {
      return NextResponse.json({ error: 'No AI response generated' }, { status: 500 })
    }

    console.log('Claude API response received, storing message...')

    // Insert AI message
    const { error: messageError } = await supabase.from('messages').insert({
      conflict_id,
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

    // Optionally notify both partners that AI responded
    // (Skip if they're actively in the chat - handled by Realtime)

    console.log('AI response generated successfully for conflict:', conflict_id)

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

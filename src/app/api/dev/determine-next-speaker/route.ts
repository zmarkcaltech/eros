import { anthropic } from '@/lib/anthropic/client'
import { NextRequest, NextResponse } from 'next/server'

interface Message {
  sender_type: 'partner_a' | 'partner_b' | 'ai'
  content: string
}

export async function POST(request: NextRequest) {
  try {
    const { partnerAName, partnerBName, recentMessages } = await request.json()

    if (!partnerAName || !partnerBName || !recentMessages) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Find the last AI mediator message
    const lastAIMessage = [...recentMessages]
      .reverse()
      .find((msg: Message) => msg.sender_type === 'ai')

    if (!lastAIMessage) {
      // No AI message yet, start with partner_a
      return NextResponse.json({ nextSpeaker: 'partner_a' })
    }

    // Use Claude to determine who the mediator is addressing
    const prompt = `You are analyzing a couples mediation conversation to determine which partner should speak next.

**Partner Names:**
- Partner A: ${partnerAName}
- Partner B: ${partnerBName}

**Mediator's Last Message:**
"${lastAIMessage.content}"

**Task:** Based on the mediator's message, determine which partner should respond next.

**Rules:**
1. If the mediator directly addresses one partner by name (e.g., "${partnerAName}, what happened..."), that partner should respond
2. If the mediator asks a question or makes a statement clearly directed at one specific partner, that partner should respond
3. If the mediator is summarizing or making a general statement to both, look at context to see who spoke most recently and give the other partner a turn
4. If the mediator asks "Partner A" or "Partner B" explicitly, map that to the actual names
5. The mediator controls the flow - respect their direction

**Response Format:**
Respond with ONLY one word: either "partner_a" or "partner_b"

Do not include any explanation, punctuation, or other text. Just the partner identifier.`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Use Haiku for fast, cheap analysis
      max_tokens: 20,
      temperature: 0,
      messages: [{
        role: 'user',
        content: prompt
      }]
    })

    const determination = response.content[0].type === 'text'
      ? response.content[0].text.trim().toLowerCase()
      : ''

    // Validate response
    if (determination !== 'partner_a' && determination !== 'partner_b') {
      console.warn('Invalid speaker determination:', determination, 'defaulting to partner_a')
      return NextResponse.json({ nextSpeaker: 'partner_a' })
    }

    console.log('AI mediator message:', lastAIMessage.content.substring(0, 100))
    console.log('Determined next speaker:', determination)

    return NextResponse.json({ nextSpeaker: determination })
  } catch (error) {
    console.error('Error determining next speaker:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to determine next speaker: ${errorMessage}` },
      { status: 500 }
    )
  }
}

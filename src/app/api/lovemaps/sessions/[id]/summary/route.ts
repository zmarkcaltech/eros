import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

// POST /api/lovemaps/sessions/[id]/summary - Generate AI session summary
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch session with relationship info
    const { data: session, error: sessionError } = await supabase
      .from('love_map_sessions')
      .select(`
        *,
        relationship:relationships(
          id,
          partner_a_id,
          partner_b_id,
          partner_a:profiles!relationships_partner_a_id_fkey(full_name, preferred_name),
          partner_b:profiles!relationships_partner_b_id_fkey(full_name, preferred_name)
        )
      `)
      .eq('id', id)
      .single()

    if (sessionError || !session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Verify user is part of the relationship
    const relationship = session.relationship as any
    const isPartner = relationship.partner_a_id === user.id || relationship.partner_b_id === user.id
    if (!isPartner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Check if summary already exists
    if (session.tiny_action) {
      return NextResponse.json({
        tiny_action: session.tiny_action,
        learned_items: session.learned_items
      })
    }

    // Fetch all completed rounds with questions
    const { data: rounds, error: roundsError } = await supabase
      .from('love_map_rounds')
      .select(`
        *,
        question:love_map_questions(*)
      `)
      .eq('session_id', id)
      .eq('status', 'completed')
      .order('round_number', { ascending: true })

    if (roundsError || !rounds || rounds.length === 0) {
      return NextResponse.json({ error: 'No completed rounds found' }, { status: 400 })
    }

    // Get partner names
    const partnerA = relationship.partner_a
    const partnerB = relationship.partner_b
    const partnerAName = partnerA.preferred_name || partnerA.full_name
    const partnerBName = partnerB.preferred_name || partnerB.full_name

    // Build context for AI
    const roundsSummary = rounds.map((round: any, index: number) => {
      const answeringName = round.answering_partner === 'partner_a' ? partnerAName : partnerBName
      const guessingName = round.answering_partner === 'partner_a' ? partnerBName : partnerAName

      return `
Round ${index + 1}:
Question: ${round.question.prompt}
Category: ${round.question.category.replace('_', ' ')}
${answeringName}'s Answer: ${round.private_answer}
${guessingName}'s Guess: ${round.guess}
Rating: ${round.closeness_rating?.replace('_', ' ')}
${round.clarification ? `Clarification: ${round.clarification}` : ''}
${round.reflection ? `Reflection: ${round.reflection}` : ''}
      `.trim()
    }).join('\n\n')

    // Generate AI summary using Claude
    const prompt = `Analyze this MapQuest for Couples session for ${partnerAName} and ${partnerBName}.

${roundsSummary}

Session Stats:
- Map Points: ${session.map_points} (accuracy)
- Discovery Points: ${session.discovery_points} (new learnings)
- Care Coins: ${session.care_coins} (emotional skill)

Generate:
1. A list of 2-4 specific new things they learned about each other (based on "new_discovery" or "partly_right" rounds)
2. One tiny, specific action they can take in the next 48 hours based on their discoveries

Requirements:
- Use warm, playful language that feels encouraging
- Frame missed guesses as discoveries, not failures
- The tiny action should be concrete and realistic (not vague like "communicate better")
- Base the action on actual content from the rounds
- Keep it brief and actionable

Format your response as JSON:
{
  "learned_items": ["specific item 1", "specific item 2", ...],
  "tiny_action": "One specific action for the next 48 hours"
}`

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from AI')
    }

    // Parse JSON response
    const aiResponse = JSON.parse(content.text)

    // Update session with summary
    const { error: updateError } = await supabase
      .from('love_map_sessions')
      .update({
        learned_items: aiResponse.learned_items,
        tiny_action: aiResponse.tiny_action,
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating session:', updateError)
      return NextResponse.json({ error: 'Failed to save summary' }, { status: 500 })
    }

    return NextResponse.json({
      learned_items: aiResponse.learned_items,
      tiny_action: aiResponse.tiny_action
    })
  } catch (error) {
    console.error('Generate summary error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

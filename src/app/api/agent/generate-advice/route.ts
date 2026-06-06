import { anthropic, AGENT_CONFIG } from '@/lib/anthropic/client'
import { buildTherapeuticPrompt, buildSystemPrompt } from '@/lib/anthropic/prompts'
import { createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/agent/generate-advice - Generate therapeutic advice using Claude
export async function POST(request: NextRequest) {
  try {
    const { conflict_id } = await request.json()

    if (!conflict_id) {
      return NextResponse.json({ error: 'Conflict ID is required' }, { status: 400 })
    }

    // Use service role client to bypass RLS and read both perspectives
    const supabase = createServiceClient()

    // Fetch conflict with all related data
    const { data: conflict, error: conflictError } = await supabase
      .from('conflicts')
      .select(`
        *,
        relationships (
          *,
          partner_a:profiles!relationships_partner_a_id_fkey (
            id,
            full_name,
            self_description
          ),
          partner_b:profiles!relationships_partner_b_id_fkey (
            id,
            full_name,
            self_description
          )
        ),
        perspectives (
          submitted_by,
          content
        )
      `)
      .eq('id', conflict_id)
      .single()

    if (conflictError || !conflict) {
      console.error('Conflict fetch error:', conflictError)
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 })
    }

    // Validate both perspectives exist
    if (conflict.perspectives.length !== 2) {
      return NextResponse.json(
        { error: `Both perspectives required (found ${conflict.perspectives.length})` },
        { status: 400 }
      )
    }

    // Check if advice already exists
    const { data: existingAdvice } = await supabase
      .from('advice')
      .select('id')
      .eq('conflict_id', conflict_id)
      .single()

    if (existingAdvice) {
      return NextResponse.json(
        { error: 'Advice already generated for this conflict' },
        { status: 400 }
      )
    }

    // Organize perspectives by partner
    const perspectiveA = conflict.perspectives.find(
      (p: any) => p.submitted_by === conflict.relationships.partner_a_id
    )
    const perspectiveB = conflict.perspectives.find(
      (p: any) => p.submitted_by === conflict.relationships.partner_b_id
    )

    if (!perspectiveA || !perspectiveB) {
      return NextResponse.json(
        { error: 'Could not match perspectives to partners' },
        { status: 500 }
      )
    }

    // Build the therapeutic prompt
    const userPrompt = buildTherapeuticPrompt(
      {
        name: conflict.relationships.partner_a.full_name,
        selfDescription: conflict.relationships.partner_a.self_description,
        perspective: perspectiveA.content,
      },
      {
        name: conflict.relationships.partner_b.full_name,
        selfDescription: conflict.relationships.partner_b.self_description,
        perspective: perspectiveB.content,
      },
      conflict.relationships.relationship_description,
      conflict.title
    )

    console.log('Calling Claude API for conflict:', conflict_id)

    // Call Claude API
    const response = await anthropic.messages.create({
      ...AGENT_CONFIG,
      system: buildSystemPrompt(),
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const adviceContent = response.content[0].type === 'text' ? response.content[0].text : ''

    if (!adviceContent) {
      return NextResponse.json({ error: 'No advice generated' }, { status: 500 })
    }

    console.log('Claude API response received, storing advice...')

    // Store advice in database
    const { error: adviceError } = await supabase.from('advice').insert({
      conflict_id,
      content: adviceContent,
      model: response.model,
      tokens_used: response.usage.input_tokens + response.usage.output_tokens,
    })

    if (adviceError) {
      console.error('Advice storage error:', adviceError)
      return NextResponse.json({ error: adviceError.message }, { status: 500 })
    }

    // Update conflict status to completed
    const { error: updateError } = await supabase
      .from('conflicts')
      .update({ status: 'completed' })
      .eq('id', conflict_id)

    if (updateError) {
      console.error('Status update error:', updateError)
    }

    // Notify both partners that advice is ready
    await supabase.from('notifications').insert([
      {
        user_id: conflict.relationships.partner_a_id,
        conflict_id,
        type: 'advice_ready',
      },
      {
        user_id: conflict.relationships.partner_b_id,
        conflict_id,
        type: 'advice_ready',
      },
    ])

    console.log('Advice generated successfully for conflict:', conflict_id)

    return NextResponse.json({
      success: true,
      tokens: response.usage.input_tokens + response.usage.output_tokens,
    })
  } catch (error: any) {
    console.error('Generate advice error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

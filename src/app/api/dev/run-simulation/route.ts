import { createClient as createServerClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

interface PartnerConfig {
  fullName: string
  preferredName: string
  age: number
  pronouns: string
  occupation: string
  selfDescription: string
  interests: string
  personality?: string
  hiddenTruth?: string
  enthusiasmLevel?: 'low' | 'medium' | 'high'
  communicationStyle?: string
}

interface RelationshipConfig {
  durationMonths: number
  description: string
  goals: string
  howWeMet: string
  livingSituation: string
}

interface SimulationConfig {
  scenario: string
  numTurns: number
  partnerA: PartnerConfig
  partnerB: PartnerConfig
  relationship: RelationshipConfig
  tags?: string[]
}

interface Message {
  sender_type: 'partner_a' | 'partner_b' | 'ai'
  sender_id?: string
  content: string
  created_at: string
}

export async function POST(request: NextRequest) {
  const startTime = Date.now()

  try {
    const config: SimulationConfig = await request.json()

    if (!config.scenario || !config.numTurns || !config.partnerA || !config.partnerB || !config.relationship) {
      return NextResponse.json(
        { error: 'Missing required simulation config fields' },
        { status: 400 }
      )
    }

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

    // Create test relationship
    console.log('Creating test relationship for simulation...')
    const createResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/create-test-relationship`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        partnerA: config.partnerA,
        partnerB: config.partnerB,
        relationship: config.relationship
      })
    })

    if (!createResponse.ok) {
      const error = await createResponse.json()
      throw new Error(`Failed to create test relationship: ${error.error}`)
    }

    const { relationship } = await createResponse.json()
    const relationshipId = relationship.id

    console.log(`Test relationship created: ${relationshipId}`)

    // Run simulation
    let nextSpeaker: 'partner_a' | 'partner_b' = 'partner_a'
    const transcript: Message[] = []

    for (let turn = 0; turn < config.numTurns; turn++) {
      console.log(`Turn ${turn + 1}/${config.numTurns}: Generating message for ${nextSpeaker}`)

      // Fetch current messages
      const messagesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/messages?relationshipId=${relationshipId}`)
      const messagesData = await messagesResponse.json()
      const currentMessages = messagesData.messages || []

      // Generate partner message
      const partnerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/simulate-partner`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipId,
          partner: nextSpeaker,
          scenario: config.scenario,
          recentMessages: currentMessages.slice(-10)
        })
      })

      const partnerData = await partnerResponse.json()
      if (!partnerResponse.ok) {
        throw new Error(`Failed to generate partner message: ${partnerData.error}`)
      }

      const partnerMessage = partnerData.message

      // Send partner message
      const sendResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/send-message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          relationshipId,
          senderId: nextSpeaker === 'partner_a' ? relationship.partner_a_id : relationship.partner_b_id,
          senderType: nextSpeaker,
          content: partnerMessage
        })
      })

      if (!sendResponse.ok) {
        const error = await sendResponse.json()
        throw new Error(`Failed to send message: ${error.error}`)
      }

      // Wait for AI mediator response (8 seconds should be enough for Claude Opus)
      await new Promise(resolve => setTimeout(resolve, 8000))

      // Determine next speaker based on AI mediator's response
      const speakerResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/determine-next-speaker`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerAName: config.partnerA.preferredName,
          partnerBName: config.partnerB.preferredName,
          recentMessages: (await (await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/messages?relationshipId=${relationshipId}`)).json()).messages || []
        })
      })

      const speakerData = await speakerResponse.json()
      nextSpeaker = speakerData.nextSpeaker || 'partner_a'

      console.log(`Next speaker: ${nextSpeaker}`)
    }

    // Fetch final transcript
    const finalMessagesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/messages?relationshipId=${relationshipId}`)
    const finalMessagesData = await finalMessagesResponse.json()
    const finalMessages = finalMessagesData.messages || []

    // Calculate metrics
    const partnerAMessages = finalMessages.filter((m: Message) => m.sender_type === 'partner_a').length
    const partnerBMessages = finalMessages.filter((m: Message) => m.sender_type === 'partner_b').length
    const mediatorMessages = finalMessages.filter((m: Message) => m.sender_type === 'ai').length
    const durationSeconds = Math.floor((Date.now() - startTime) / 1000)

    // Store simulation run
    const { data: simulationRun, error: insertError } = await supabase
      .from('dev_simulation_runs')
      .insert({
        scenario: config.scenario,
        num_turns: config.numTurns,
        partner_a_config: config.partnerA,
        partner_b_config: config.partnerB,
        relationship_config: config.relationship,
        relationship_id: relationshipId,
        transcript: finalMessages,
        total_messages: finalMessages.length,
        mediator_messages: mediatorMessages,
        partner_a_messages: partnerAMessages,
        partner_b_messages: partnerBMessages,
        duration_seconds: durationSeconds,
        tags: config.tags || []
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store simulation run:', insertError)
      // Don't fail the request, just log it
    }

    console.log(`Simulation complete in ${durationSeconds}s`)

    return NextResponse.json({
      success: true,
      simulationId: simulationRun?.id,
      relationshipId,
      transcript: finalMessages,
      metrics: {
        totalMessages: finalMessages.length,
        partnerAMessages,
        partnerBMessages,
        mediatorMessages,
        durationSeconds
      }
    })
  } catch (error) {
    console.error('Simulation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Simulation failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}

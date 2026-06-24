import { createClient as createServerClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import {
  MEDIATION_QUALITY_JUDGE_PROMPT,
  PARTNER_A_EXPERIENCE_JUDGE_PROMPT,
  PARTNER_B_EXPERIENCE_JUDGE_PROMPT,
  SAFETY_JUDGE_PROMPT,
  MONETIZATION_JUDGE_PROMPT
} from '@/lib/evaluation-agents'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!
})

interface PartnerConfig {
  fullName: string
  preferredName: string
  age: number
  pronouns: string
  occupation: string
  selfDescription: string
  interests: string
  personality?: string
  persona?: string
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
  scenario_id?: string
  scenario: string
  scenario_category?: string
  severity?: string
  topic?: string
  numTurns: number
  partnerA: PartnerConfig
  partnerB: PartnerConfig
  relationship: RelationshipConfig
  tags?: string[]
  safetyRisk?: string
  targetOutcome?: any
  failureConditions?: string[]
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
    console.log('Creating test relationship for enhanced simulation...')
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

      // Wait for AI mediator response
      await new Promise(resolve => setTimeout(resolve, 8000))

      // Determine next speaker
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
    }

    // Fetch final transcript
    const finalMessagesResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/messages?relationshipId=${relationshipId}`)
    const finalMessagesData = await finalMessagesResponse.json()
    const finalMessages = finalMessagesData.messages || []

    console.log(`Simulation complete. Running 5-agent evaluation system...`)

    // Calculate basic metrics
    const partnerAMessages = finalMessages.filter((m: Message) => m.sender_type === 'partner_a')
    const partnerBMessages = finalMessages.filter((m: Message) => m.sender_type === 'partner_b')
    const mediatorMessages = finalMessages.filter((m: Message) => m.sender_type === 'ai')

    const aiMessageLengths = mediatorMessages.map((m: Message) => m.content.split(/\s+/).length)
    const avgAiMessageLength = aiMessageLengths.length > 0
      ? aiMessageLengths.reduce((a: number, b: number) => a + b, 0) / aiMessageLengths.length
      : 0
    const maxAiMessageLength = aiMessageLengths.length > 0 ? Math.max(...aiMessageLengths) : 0

    const durationSeconds = Math.floor((Date.now() - startTime) / 1000)
    const partnerBalanceRatio = partnerAMessages.length > 0
      ? partnerBMessages.length / partnerAMessages.length
      : 0

    // Run evaluation agents
    const transcriptText = formatTranscriptForEvaluation(finalMessages, config.partnerA.preferredName, config.partnerB.preferredName)

    const [mediationEval, partnerAEval, partnerBEval, safetyEval, monetizationEval] = await Promise.all([
      runMediationQualityJudge(transcriptText),
      runPartnerExperienceJudge(transcriptText, 'A', config.partnerA.preferredName),
      runPartnerExperienceJudge(transcriptText, 'B', config.partnerB.preferredName),
      runSafetyJudge(transcriptText),
      runMonetizationJudge(transcriptText)
    ])

    console.log('Evaluation complete. Storing results...')

    // Store comprehensive simulation results
    const { data: simulationRun, error: insertError } = await supabase
      .from('dev_simulation_runs')
      .insert({
        // Scenario metadata
        scenario: config.scenario,
        scenario_category: config.scenario_category,
        severity: config.severity,
        topic: config.topic,
        num_turns: config.numTurns,
        partner_a_config: config.partnerA,
        partner_b_config: config.partnerB,
        relationship_config: config.relationship,
        partner_a_persona: config.partnerA.persona,
        partner_b_persona: config.partnerB.persona,
        hidden_truth_a: config.partnerA.hiddenTruth,
        hidden_truth_b: config.partnerB.hiddenTruth,
        safety_risk: config.safetyRisk,
        max_rounds: config.numTurns,
        tags: config.tags || [],

        // Execution metrics
        relationship_id: relationshipId,
        transcript: finalMessages,
        actual_rounds: config.numTurns,
        conversation_completed: true,
        total_messages: finalMessages.length,
        mediator_messages: mediatorMessages.length,
        partner_a_messages: partnerAMessages.length,
        partner_b_messages: partnerBMessages.length,
        duration_seconds: durationSeconds,
        avg_ai_message_length_words: avgAiMessageLength,
        max_ai_message_length_words: maxAiMessageLength,
        partner_balance_ratio: partnerBalanceRatio,

        // Evaluation scores
        mediation_quality_score: mediationEval?.averageScore,
        partner_a_experience_score: (partnerAEval?.likelyFeltHeard + partnerAEval?.accurateCapture + partnerAEval?.likelyContinueUsing) / 3,
        partner_b_experience_score: (partnerBEval?.likelyFeltHeard + partnerBEval?.accurateCapture + partnerBEval?.likelyContinueUsing) / 3,
        safety_score: safetyEval?.safetyScore,
        monetization_score: monetizationEval?.wouldSubscribe,

        // Pass status
        pass_status: mediationEval?.passStatus,

        // Detailed evaluations
        mediation_evaluation: mediationEval,
        partner_a_evaluation: partnerAEval,
        partner_b_evaluation: partnerBEval,
        safety_evaluation: safetyEval,
        monetization_evaluation: monetizationEval,

        // Failure analysis
        failure_tags: mediationEval?.failureTags || [],
        top_strengths: mediationEval?.topStrengths || [],
        top_weaknesses: mediationEval?.topWeaknesses || [],
        single_most_important_improvement: mediationEval?.singleMostImportantImprovement
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to store simulation run:', insertError)
      throw new Error(`Database error: ${insertError.message}`)
    }

    console.log(`Enhanced simulation stored successfully`)

    return NextResponse.json({
      success: true,
      simulationId: simulationRun?.id,
      relationshipId,
      transcript: finalMessages,
      metrics: {
        totalMessages: finalMessages.length,
        partnerAMessages: partnerAMessages.length,
        partnerBMessages: partnerBMessages.length,
        mediatorMessages: mediatorMessages.length,
        durationSeconds,
        avgAiMessageLength,
        maxAiMessageLength
      },
      evaluation: {
        mediationQuality: mediationEval,
        partnerAExperience: partnerAEval,
        partnerBExperience: partnerBEval,
        safety: safetyEval,
        monetization: monetizationEval,
        passStatus: mediationEval?.passStatus,
        failureTags: mediationEval?.failureTags
      }
    })
  } catch (error) {
    console.error('Enhanced simulation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Simulation failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}

function formatTranscriptForEvaluation(messages: Message[], partnerAName: string, partnerBName: string): string {
  return messages.map(m => {
    const speaker = m.sender_type === 'ai' ? 'Eros' :
                   m.sender_type === 'partner_a' ? partnerAName : partnerBName
    return `${speaker}: ${m.content}`
  }).join('\n\n')
}

async function runMediationQualityJudge(transcript: string) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `${MEDIATION_QUALITY_JUDGE_PROMPT}\n\n## Transcript to Evaluate:\n\n${transcript}`
      }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
    return null
  } catch (error) {
    console.error('Mediation quality judge error:', error)
    return null
  }
}

async function runPartnerExperienceJudge(transcript: string, partner: 'A' | 'B', partnerName: string) {
  try {
    const prompt = partner === 'A' ? PARTNER_A_EXPERIENCE_JUDGE_PROMPT : PARTNER_B_EXPERIENCE_JUDGE_PROMPT

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `${prompt}\n\nPartner ${partner} is named ${partnerName}.\n\n## Transcript to Evaluate:\n\n${transcript}`
      }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
    return null
  } catch (error) {
    console.error(`Partner ${partner} experience judge error:`, error)
    return null
  }
}

async function runSafetyJudge(transcript: string) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `${SAFETY_JUDGE_PROMPT}\n\n## Transcript to Evaluate:\n\n${transcript}`
      }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
    return null
  } catch (error) {
    console.error('Safety judge error:', error)
    return null
  }
}

async function runMonetizationJudge(transcript: string) {
  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-20250514',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `${MONETIZATION_JUDGE_PROMPT}\n\n## Transcript to Evaluate:\n\n${transcript}`
      }]
    })

    const content = response.content[0]
    if (content.type === 'text') {
      const jsonMatch = content.text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    }
    return null
  } catch (error) {
    console.error('Monetization judge error:', error)
    return null
  }
}

#!/usr/bin/env tsx

/**
 * CLI Script for Testing Chat Mediator
 *
 * Usage:
 *   npx tsx scripts/test-chat-simulator.ts
 *   npx tsx scripts/test-chat-simulator.ts --scenario "Conflict about chores"
 *   npx tsx scripts/test-chat-simulator.ts --turns 10 --relationship-id <uuid>
 */

import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const anthropicApiKey = process.env.ANTHROPIC_API_KEY!

if (!supabaseUrl || !supabaseAnonKey || !anthropicApiKey) {
  console.error('❌ Missing environment variables. Ensure NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, and ANTHROPIC_API_KEY are set.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)
const anthropic = new Anthropic({ apiKey: anthropicApiKey })

interface TestConfig {
  scenario?: string
  turns: number
  relationshipId?: string
  createNew: boolean
  verbose: boolean
}

interface Message {
  id: string
  sender_type: 'partner_a' | 'partner_b' | 'ai_mediator'
  content: string
  created_at: string
}

async function parseArgs(): Promise<TestConfig> {
  const args = process.argv.slice(2)
  const config: TestConfig = {
    turns: 6,
    createNew: true,
    verbose: true
  }

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--scenario':
        config.scenario = args[++i]
        break
      case '--turns':
        config.turns = parseInt(args[++i], 10)
        break
      case '--relationship-id':
        config.relationshipId = args[++i]
        config.createNew = false
        break
      case '--quiet':
        config.verbose = false
        break
      case '--help':
        console.log(`
Chat Simulator CLI

Usage:
  npx tsx scripts/test-chat-simulator.ts [options]

Options:
  --scenario <text>         Conflict/scenario to simulate
  --turns <number>          Number of turns (default: 6)
  --relationship-id <uuid>  Use existing relationship instead of creating new one
  --quiet                   Minimal output
  --help                    Show this help

Examples:
  npx tsx scripts/test-chat-simulator.ts
  npx tsx scripts/test-chat-simulator.ts --scenario "Disagreement about household chores" --turns 8
  npx tsx scripts/test-chat-simulator.ts --relationship-id abc-123-def --turns 10
        `)
        process.exit(0)
    }
  }

  return config
}

async function createTestRelationship() {
  console.log('📝 Creating test relationship...')

  const timestamp = Date.now()
  const emailA = `cli-test-a-${timestamp}@example.com`
  const emailB = `cli-test-b-${timestamp}@example.com`
  const password = 'TestPassword123!'

  // Create Partner A
  const { data: userA, error: errorA } = await supabase.auth.signUp({
    email: emailA,
    password: password
  })

  if (errorA || !userA.user) {
    throw new Error(`Failed to create Partner A: ${errorA?.message}`)
  }

  // Create Partner B
  const { data: userB, error: errorB } = await supabase.auth.signUp({
    email: emailB,
    password: password
  })

  if (errorB || !userB.user) {
    throw new Error(`Failed to create Partner B: ${errorB?.message}`)
  }

  // Update profiles
  await supabase
    .from('profiles')
    .update({
      full_name: 'Alex CLI',
      preferred_name: 'Alex',
      age: 28,
      pronouns: 'they/them',
      occupation: 'Software Engineer',
      self_description: 'I value clear communication. Sometimes I get overwhelmed with work stress.',
      interests: 'Hiking, cooking, reading'
    })
    .eq('id', userA.user.id)

  await supabase
    .from('profiles')
    .update({
      full_name: 'Jordan CLI',
      preferred_name: 'Jordan',
      age: 30,
      pronouns: 'she/her',
      occupation: 'Graphic Designer',
      self_description: 'I\'m creative and emotional. I need verbal affirmation.',
      interests: 'Art, yoga, traveling'
    })
    .eq('id', userB.user.id)

  // Create relationship
  const linkCode = Math.random().toString(36).substring(2, 8).toUpperCase()

  const { data: relationship, error: relError } = await supabase
    .from('relationships')
    .insert({
      partner_a_id: userA.user.id,
      partner_b_id: userB.user.id,
      status: 'active',
      link_code: linkCode,
      duration_months: 24,
      relationship_description: 'Test relationship for CLI simulation',
      relationship_goals: 'Improve communication and conflict resolution'
    })
    .select(`
      *,
      partner_a:profiles!relationships_partner_a_id_fkey(*),
      partner_b:profiles!relationships_partner_b_id_fkey(*)
    `)
    .single()

  if (relError || !relationship) {
    throw new Error(`Failed to create relationship: ${relError?.message}`)
  }

  console.log(`✅ Created relationship: ${relationship.id}`)
  console.log(`   Partner A: ${relationship.partner_a.preferred_name} (${emailA})`)
  console.log(`   Partner B: ${relationship.partner_b.preferred_name} (${emailB})`)

  return relationship
}

async function getRelationship(id: string) {
  const { data: relationship, error } = await supabase
    .from('relationships')
    .select(`
      *,
      partner_a:profiles!relationships_partner_a_id_fkey(*),
      partner_b:profiles!relationships_partner_b_id_fkey(*)
    `)
    .eq('id', id)
    .single()

  if (error || !relationship) {
    throw new Error(`Relationship not found: ${error?.message}`)
  }

  return relationship
}

async function getRecentMessages(relationshipId: string, limit = 10): Promise<Message[]> {
  const { data } = await supabase
    .from('chat_messages')
    .select('*')
    .eq('relationship_id', relationshipId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return (data || []).reverse() as Message[]
}

async function generatePartnerMessage(
  relationship: any,
  partner: 'partner_a' | 'partner_b',
  scenario: string | undefined,
  recentMessages: Message[]
) {
  const speakingPartner = partner === 'partner_a' ? relationship.partner_a : relationship.partner_b
  const otherPartner = partner === 'partner_a' ? relationship.partner_b : relationship.partner_a

  let conversationContext = ''
  if (recentMessages.length > 0) {
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
    model: 'claude-opus-4-20250514',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

async function sendMessage(
  relationshipId: string,
  senderId: string,
  senderType: 'partner_a' | 'partner_b',
  content: string
) {
  const { error } = await supabase
    .from('chat_messages')
    .insert({
      relationship_id: relationshipId,
      sender_id: senderId,
      sender_type: senderType,
      content
    })

  if (error) {
    throw new Error(`Failed to send message: ${error.message}`)
  }
}

function printMessage(message: Message, partnerAName: string, partnerBName: string) {
  const timestamp = new Date(message.created_at).toLocaleTimeString()
  let sender = ''
  let color = ''

  switch (message.sender_type) {
    case 'partner_a':
      sender = `${partnerAName}:`
      color = '\x1b[35m' // Magenta
      break
    case 'partner_b':
      sender = `${partnerBName}:`
      color = '\x1b[36m' // Cyan
      break
    case 'ai_mediator':
      sender = 'AI Mediator:'
      color = '\x1b[34m' // Blue
      break
  }

  const reset = '\x1b[0m'
  const gray = '\x1b[90m'

  console.log(`${gray}[${timestamp}]${reset} ${color}${sender}${reset} ${message.content}`)
}

async function waitForMediatorResponse(relationshipId: string, afterMessageId: string, timeout = 30000): Promise<Message | null> {
  const startTime = Date.now()

  while (Date.now() - startTime < timeout) {
    const { data } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('relationship_id', relationshipId)
      .eq('sender_type', 'ai_mediator')
      .gt('created_at', afterMessageId)
      .order('created_at', { ascending: false })
      .limit(1)

    if (data && data.length > 0) {
      return data[0] as Message
    }

    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return null
}

async function runSimulation(config: TestConfig) {
  console.log('\n🚀 Starting Chat Simulation\n')

  // Get or create relationship
  const relationship = config.relationshipId
    ? await getRelationship(config.relationshipId)
    : await createTestRelationship()

  const partnerAName = relationship.partner_a.preferred_name || relationship.partner_a.full_name
  const partnerBName = relationship.partner_b.preferred_name || relationship.partner_b.full_name

  if (config.scenario) {
    console.log(`\n📋 Scenario: ${config.scenario}\n`)
  }

  console.log('💬 Conversation:\n')

  // Run simulation
  for (let i = 0; i < config.turns; i++) {
    const partner = i % 2 === 0 ? 'partner_a' : 'partner_b'
    const senderId = partner === 'partner_a' ? relationship.partner_a_id : relationship.partner_b_id
    const speakerName = partner === 'partner_a' ? partnerAName : partnerBName

    if (config.verbose) {
      process.stdout.write(`\r⏳ Turn ${i + 1}/${config.turns}: ${speakerName} is thinking...`)
    }

    // Get recent messages
    const recentMessages = await getRecentMessages(relationship.id, 10)

    // Generate message
    const messageContent = await generatePartnerMessage(
      relationship,
      partner,
      config.scenario,
      recentMessages
    )

    // Send message
    await sendMessage(relationship.id, senderId, partner, messageContent)

    if (config.verbose) {
      process.stdout.write('\r' + ' '.repeat(80) + '\r') // Clear line
    }

    // Fetch the sent message to get its timestamp
    const { data: sentMessages } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('relationship_id', relationship.id)
      .eq('sender_type', partner)
      .order('created_at', { ascending: false })
      .limit(1)

    if (sentMessages && sentMessages.length > 0) {
      printMessage(sentMessages[0], partnerAName, partnerBName)

      // Wait for mediator response
      if (config.verbose) {
        process.stdout.write('⏳ Waiting for AI Mediator response...')
      }

      const mediatorMessage = await waitForMediatorResponse(relationship.id, sentMessages[0].created_at)

      if (config.verbose) {
        process.stdout.write('\r' + ' '.repeat(80) + '\r') // Clear line
      }

      if (mediatorMessage) {
        printMessage(mediatorMessage, partnerAName, partnerBName)
      }

      console.log() // Blank line for spacing
    }

    // Small delay between turns
    await new Promise(resolve => setTimeout(resolve, 1000))
  }

  console.log('\n✅ Simulation complete!')
  console.log(`\n📊 Stats:`)
  console.log(`   Relationship ID: ${relationship.id}`)
  console.log(`   Total turns: ${config.turns}`)
  console.log(`   Scenario: ${config.scenario || 'None specified'}`)
}

// Main execution
async function main() {
  try {
    const config = await parseArgs()
    await runSimulation(config)
  } catch (error) {
    console.error('\n❌ Error:', error instanceof Error ? error.message : error)
    process.exit(1)
  }
}

main()

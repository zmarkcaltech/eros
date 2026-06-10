// ============================================
// Relationship-Based Conversational Prompts
// ============================================

interface RelationshipContext {
  id: string
  partner_a_id: string
  partner_b_id: string
  status: string
  relationship_description: string | null
  relationship_goals: string | null
  duration_months: number | null
  how_we_met: string | null
  living_situation: string | null
  children_info: string | null
  partner_a: PartnerProfile
  partner_b: PartnerProfile
}

interface PartnerProfile {
  id: string
  full_name: string
  preferred_name: string | null
  self_description: string | null
  age: number | null
  pronouns: string | null
  occupation: string | null
  interests: string | null
}

interface Message {
  sender_type: 'partner_a' | 'partner_b' | 'ai'
  content: string
  created_at: string
}

export function buildTherapistSystemPrompt(relationship: RelationshipContext): string {
  const partnerA = relationship.partner_a.preferred_name || relationship.partner_a.full_name
  const partnerB = relationship.partner_b.preferred_name || relationship.partner_b.full_name

  // Build biographical context
  const bioContext: string[] = []

  if (relationship.duration_months) {
    const years = Math.floor(relationship.duration_months / 12)
    const months = relationship.duration_months % 12
    if (years > 0) {
      bioContext.push(`They have been together for ${years} year${years > 1 ? 's' : ''}${months > 0 ? ` and ${months} month${months > 1 ? 's' : ''}` : ''}.`)
    } else {
      bioContext.push(`They have been together for ${months} month${months > 1 ? 's' : ''}.`)
    }
  }

  if (relationship.how_we_met) {
    bioContext.push(`How they met: ${relationship.how_we_met}`)
  }

  if (relationship.living_situation) {
    bioContext.push(`Living situation: ${relationship.living_situation}`)
  }

  if (relationship.children_info) {
    bioContext.push(`Children: ${relationship.children_info}`)
  }

  const partnerADetails: string[] = []
  if (relationship.partner_a.age) partnerADetails.push(`Age: ${relationship.partner_a.age}`)
  if (relationship.partner_a.pronouns) partnerADetails.push(`Pronouns: ${relationship.partner_a.pronouns}`)
  if (relationship.partner_a.occupation) partnerADetails.push(`Occupation: ${relationship.partner_a.occupation}`)
  if (relationship.partner_a.interests) partnerADetails.push(`Interests: ${relationship.partner_a.interests}`)
  if (relationship.partner_a.self_description) partnerADetails.push(`Self-description: ${relationship.partner_a.self_description}`)

  const partnerBDetails: string[] = []
  if (relationship.partner_b.age) partnerBDetails.push(`Age: ${relationship.partner_b.age}`)
  if (relationship.partner_b.pronouns) partnerBDetails.push(`Pronouns: ${relationship.partner_b.pronouns}`)
  if (relationship.partner_b.occupation) partnerBDetails.push(`Occupation: ${relationship.partner_b.occupation}`)
  if (relationship.partner_b.interests) partnerBDetails.push(`Interests: ${relationship.partner_b.interests}`)
  if (relationship.partner_b.self_description) partnerBDetails.push(`Self-description: ${relationship.partner_b.self_description}`)

  return `You are a compassionate, skilled couples therapist facilitating ongoing couples therapy for ${partnerA} and ${partnerB}.

## Relationship Context

${bioContext.length > 0 ? bioContext.join(' ') : 'Limited background information available.'}

${relationship.relationship_description ? `**About Their Relationship**: ${relationship.relationship_description}` : ''}

${relationship.relationship_goals ? `**Therapy Goals**: ${relationship.relationship_goals}` : '**Therapy Goals**: Not specified'}

**${partnerA}**:
${partnerADetails.length > 0 ? partnerADetails.join(', ') : 'No additional information provided'}

**${partnerB}**:
${partnerBDetails.length > 0 ? partnerBDetails.join(', ') : 'No additional information provided'}

## Your Role as Therapist

You are facilitating ongoing couples therapy through conversation. This is not a one-time conflict resolution session - it's a continuous therapeutic relationship. Your responsibilities:

1. **Active Listening**: Acknowledge what each person shares. Validate their feelings without taking sides.

2. **Facilitate Dialogue**: Encourage both partners to express themselves openly. Ask clarifying questions. Help them understand each other's perspectives.

3. **Maintain Balance**: Ensure both voices are heard equally. If one partner dominates the conversation, gently invite the other to share.

4. **Identify Patterns**: Point out communication dynamics, emotional triggers, unspoken needs, or recurring themes across the full conversation history.

5. **Offer Therapeutic Insights**: When appropriate, provide observations about underlying issues, attachment patterns, or healthier communication approaches.

6. **Guide Toward Growth**: Help the couple build skills for better communication, conflict resolution, and emotional intimacy. Reference their stated goals when relevant.

7. **Maintain Continuity**: You have access to the full conversation history. Reference previous topics, patterns, or progress when relevant.

8. **Safety First**: Watch for red flags (abuse, manipulation, severe distress, safety threats). If present, recommend professional in-person help immediately.

## Response Guidelines

- Keep responses **concise** (2-4 paragraphs, 100-300 words). This is an ongoing conversation, not a lecture.
- Use a **warm, conversational tone** while maintaining professionalism.
- **Ask questions** to deepen understanding or encourage reflection and self-awareness.
- Address both partners by their preferred names when relevant.
- Respond to the immediate message while keeping the full conversation history in context.
- Use "I" statements when giving feedback ("I notice...", "I'm hearing...", "I wonder if...")
- Avoid therapeutic jargon; use clear, accessible language.
- When relevant, gently reference their therapy goals to keep them focused.

## Important Limitations

You are an AI therapist providing general guidance, NOT a licensed in-person therapist. If you detect signs of:
- Abuse (physical, emotional, financial, sexual) or safety concerns
- Severe mental health crises (suicidal ideation, psychosis, severe depression)
- Substance abuse requiring intervention
- Patterns of manipulation, gaslighting, or coercive control

Immediately:
1. Express concern for their wellbeing
2. Acknowledge the seriousness
3. **Strongly recommend seeking professional help** from a licensed therapist, crisis hotline, or appropriate support services
4. Provide supportive guidance but emphasize the critical need for in-person professional intervention

## Tone & Approach

Empathetic, patient, non-judgmental, supportive, and grounded in evidence-based therapeutic practices. You're here to help them communicate better, understand each other, and grow together - not to solve their problems for them. Guide them toward their own insights and solutions.`
}

export function buildConversationContext(
  messages: Message[],
  partnerA: PartnerProfile,
  partnerB: PartnerProfile
): Array<{ role: 'user' | 'assistant'; content: string }> {
  return messages.map(msg => {
    if (msg.sender_type === 'ai') {
      return {
        role: 'assistant' as const,
        content: msg.content
      }
    } else {
      const senderName = msg.sender_type === 'partner_a'
        ? (partnerA.preferred_name || partnerA.full_name)
        : (partnerB.preferred_name || partnerB.full_name)

      return {
        role: 'user' as const,
        content: `[${senderName}]: ${msg.content}`
      }
    }
  })
}

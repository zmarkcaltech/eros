import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // Create two test users
    const timestamp = Date.now()
    const emailA = `test-partner-a-${timestamp}@example.com`
    const emailB = `test-partner-b-${timestamp}@example.com`
    const password = 'TestPassword123!'

    // Sign up Partner A
    const { data: userA, error: errorA } = await supabase.auth.signUp({
      email: emailA,
      password: password,
      options: {
        data: {
          full_name: 'Alex Test',
          preferred_name: 'Alex'
        }
      }
    })

    if (errorA || !userA.user) {
      throw new Error(`Failed to create Partner A: ${errorA?.message}`)
    }

    // Sign up Partner B
    const { data: userB, error: errorB } = await supabase.auth.signUp({
      email: emailB,
      password: password,
      options: {
        data: {
          full_name: 'Jordan Test',
          preferred_name: 'Jordan'
        }
      }
    })

    if (errorB || !userB.user) {
      throw new Error(`Failed to create Partner B: ${errorB?.message}`)
    }

    // Update profiles with more details
    await supabase
      .from('profiles')
      .update({
        age: 28,
        pronouns: 'they/them',
        occupation: 'Software Engineer',
        self_description: 'I value clear communication and quality time together. Sometimes I get overwhelmed with work stress.',
        interests: 'Hiking, cooking, reading sci-fi'
      })
      .eq('id', userA.user.id)

    await supabase
      .from('profiles')
      .update({
        age: 30,
        pronouns: 'she/her',
        occupation: 'Graphic Designer',
        self_description: 'I\'m creative and emotional. I need verbal affirmation and struggle when I feel unheard.',
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
        relationship_description: 'We met at a coffee shop and have been together for 2 years. We love spending time together but sometimes struggle with communication during stressful times.',
        relationship_goals: 'Improve our communication patterns, learn to handle conflict better, and reconnect emotionally.',
        how_we_met: 'At a local coffee shop - we both reached for the last blueberry muffin',
        living_situation: 'Living together in a one-bedroom apartment'
      })
      .select()
      .single()

    if (relError || !relationship) {
      throw new Error(`Failed to create relationship: ${relError?.message}`)
    }

    return NextResponse.json({
      relationship,
      credentials: {
        partnerA: { email: emailA, password },
        partnerB: { email: emailB, password }
      }
    })
  } catch (error) {
    console.error('Error creating test relationship:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create test relationship' },
      { status: 500 }
    )
  }
}

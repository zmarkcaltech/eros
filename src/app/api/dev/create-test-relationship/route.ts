import { createClient as createServerClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

interface PartnerProfile {
  fullName: string
  preferredName: string
  age: number
  pronouns: string
  occupation: string
  selfDescription: string
  interests: string
}

interface RelationshipInfo {
  durationMonths: number
  description: string
  goals: string
  howWeMet: string
  livingSituation: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      partnerA,
      partnerB,
      relationship
    }: {
      partnerA?: PartnerProfile
      partnerB?: PartnerProfile
      relationship?: RelationshipInfo
    } = body

    // Use service role to bypass RLS for dev testing
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

    // Default profiles
    const defaultPartnerA: PartnerProfile = {
      fullName: 'Alex Test',
      preferredName: 'Alex',
      age: 28,
      pronouns: 'they/them',
      occupation: 'Software Engineer',
      selfDescription: 'I value clear communication and quality time together. Sometimes I get overwhelmed with work stress.',
      interests: 'Hiking, cooking, reading sci-fi'
    }

    const defaultPartnerB: PartnerProfile = {
      fullName: 'Jordan Test',
      preferredName: 'Jordan',
      age: 30,
      pronouns: 'she/her',
      occupation: 'Graphic Designer',
      selfDescription: 'I\'m creative and emotional. I need verbal affirmation and struggle when I feel unheard.',
      interests: 'Art, yoga, traveling'
    }

    const defaultRelationship: RelationshipInfo = {
      durationMonths: 24,
      description: 'We met at a coffee shop and have been together for 2 years. We love spending time together but sometimes struggle with communication during stressful times.',
      goals: 'Improve our communication patterns, learn to handle conflict better, and reconnect emotionally.',
      howWeMet: 'At a local coffee shop - we both reached for the last blueberry muffin',
      livingSituation: 'Living together in a one-bedroom apartment'
    }

    // Merge with defaults
    const profileA = { ...defaultPartnerA, ...partnerA }
    const profileB = { ...defaultPartnerB, ...partnerB }
    const relationshipInfo = { ...defaultRelationship, ...relationship }

    // Create two test users
    const timestamp = Date.now()
    const emailA = `test-partner-a-${timestamp}@example.com`
    const emailB = `test-partner-b-${timestamp}@example.com`
    const password = 'TestPassword123!'

    // Create Partner A using admin API
    const { data: userA, error: errorA } = await supabase.auth.admin.createUser({
      email: emailA,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: profileA.fullName,
        preferred_name: profileA.preferredName
      }
    })

    if (errorA || !userA.user) {
      throw new Error(`Failed to create Partner A: ${errorA?.message}`)
    }

    // Create Partner B using admin API
    const { data: userB, error: errorB } = await supabase.auth.admin.createUser({
      email: emailB,
      password: password,
      email_confirm: true,
      user_metadata: {
        full_name: profileB.fullName,
        preferred_name: profileB.preferredName
      }
    })

    if (errorB || !userB.user) {
      throw new Error(`Failed to create Partner B: ${errorB?.message}`)
    }

    // Manually create profile records (admin.createUser doesn't trigger the profile creation)
    const { error: profileAError } = await supabase
      .from('profiles')
      .insert({
        id: userA.user.id,
        email: emailA,
        full_name: profileA.fullName,
        preferred_name: profileA.preferredName,
        age: profileA.age,
        pronouns: profileA.pronouns,
        occupation: profileA.occupation,
        self_description: profileA.selfDescription,
        interests: profileA.interests
      })

    if (profileAError) {
      throw new Error(`Failed to create Partner A profile: ${profileAError.message}`)
    }

    const { error: profileBError } = await supabase
      .from('profiles')
      .insert({
        id: userB.user.id,
        email: emailB,
        full_name: profileB.fullName,
        preferred_name: profileB.preferredName,
        age: profileB.age,
        pronouns: profileB.pronouns,
        occupation: profileB.occupation,
        self_description: profileB.selfDescription,
        interests: profileB.interests
      })

    if (profileBError) {
      throw new Error(`Failed to create Partner B profile: ${profileBError.message}`)
    }

    // Create relationship
    const linkCode = Math.random().toString(36).substring(2, 8).toUpperCase()

    const { data: rel, error: relError } = await supabase
      .from('relationships')
      .insert({
        partner_a_id: userA.user.id,
        partner_b_id: userB.user.id,
        status: 'active',
        link_code: linkCode,
        duration_months: relationshipInfo.durationMonths,
        relationship_description: relationshipInfo.description,
        relationship_goals: relationshipInfo.goals,
        how_we_met: relationshipInfo.howWeMet,
        living_situation: relationshipInfo.livingSituation
      })
      .select()
      .single()

    if (relError || !rel) {
      throw new Error(`Failed to create relationship: ${relError?.message}`)
    }

    return NextResponse.json({
      relationship: rel,
      credentials: {
        partnerA: { email: emailA, password },
        partnerB: { email: emailB, password }
      }
    })
  } catch (error) {
    console.error('Error creating test relationship:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Full error details:', errorMessage)
    return NextResponse.json(
      { error: `Failed to create test relationship: ${errorMessage}` },
      { status: 500 }
    )
  }
}

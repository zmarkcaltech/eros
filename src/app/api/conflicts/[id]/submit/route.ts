import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/conflicts/[id]/submit - Submit perspective for a conflict
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

    const { content } = await request.json()

    if (!content || content.trim().length < 50) {
      return NextResponse.json(
        { error: 'Perspective must be at least 50 characters' },
        { status: 400 }
      )
    }

    // Get conflict with relationship info
    const { data: conflict, error: conflictError } = await supabase
      .from('conflicts')
      .select(`
        *,
        relationships (
          partner_a_id,
          partner_b_id
        )
      `)
      .eq('id', id)
      .single()

    if (conflictError || !conflict) {
      return NextResponse.json({ error: 'Conflict not found' }, { status: 404 })
    }

    // Determine which partner is submitting
    const isPartnerA = conflict.relationships.partner_a_id === user.id
    const isPartnerB = conflict.relationships.partner_b_id === user.id

    if (!isPartnerA && !isPartnerB) {
      return NextResponse.json({ error: 'Not authorized for this conflict' }, { status: 403 })
    }

    // Validate submission order
    if (conflict.status === 'awaiting_partner_a' && !isPartnerA) {
      return NextResponse.json(
        { error: 'Waiting for the other partner to submit first' },
        { status: 400 }
      )
    }

    if (conflict.status === 'awaiting_partner_b' && !isPartnerB) {
      return NextResponse.json(
        { error: 'Waiting for the other partner to submit first' },
        { status: 400 }
      )
    }

    if (conflict.status === 'completed') {
      return NextResponse.json(
        { error: 'This conflict is already resolved' },
        { status: 400 }
      )
    }

    // Check if user already submitted
    const { data: existingPerspective } = await supabase
      .from('perspectives')
      .select('id')
      .eq('conflict_id', id)
      .eq('submitted_by', user.id)
      .single()

    if (existingPerspective) {
      return NextResponse.json(
        { error: 'You have already submitted your perspective' },
        { status: 400 }
      )
    }

    // Insert perspective
    const { error: perspectiveError } = await supabase
      .from('perspectives')
      .insert({
        conflict_id: id,
        submitted_by: user.id,
        content: content.trim(),
      })

    if (perspectiveError) {
      return NextResponse.json({ error: perspectiveError.message }, { status: 500 })
    }

    // Determine new status and actions
    let newStatus: string
    let notifyUserId: string | null = null
    let triggerAdvice = false

    if (conflict.status === 'awaiting_partner_a') {
      newStatus = 'awaiting_partner_b'
      notifyUserId = conflict.relationships.partner_b_id
    } else if (conflict.status === 'awaiting_partner_b') {
      newStatus = 'processing'
      triggerAdvice = true
    } else {
      return NextResponse.json({ error: 'Invalid conflict status' }, { status: 400 })
    }

    // Update conflict status
    const { error: updateError } = await supabase
      .from('conflicts')
      .update({ status: newStatus })
      .eq('id', id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Send notification to partner if needed
    if (notifyUserId) {
      const supabaseAdmin = createServiceClient()
      await supabaseAdmin.from('notifications').insert({
        user_id: notifyUserId,
        conflict_id: id,
        type: 'partner_submitted',
      })
    }

    // Trigger advice generation if both have submitted
    if (triggerAdvice) {
      // Call the advice generation endpoint asynchronously
      try {
        console.log('Triggering advice generation for conflict:', id)
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent/generate-advice`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conflict_id: id }),
        })
        const data = await response.json()
        console.log('Advice generation response:', data)
        if (!response.ok) {
          console.error('Advice generation failed:', data)
        }
      } catch (err) {
        console.error('Failed to trigger advice generation:', err)
      }
    }

    return NextResponse.json({ success: true, status: newStatus })
  } catch (error) {
    console.error('Submit perspective error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

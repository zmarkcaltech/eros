import { createClient as createServerClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// GET /api/dev/simulations - Retrieve simulation runs
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')
    const tag = searchParams.get('tag')
    const scenario = searchParams.get('scenario')
    const format = searchParams.get('format') || 'json' // json or csv

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

    let query = supabase
      .from('dev_simulation_runs')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (tag) {
      query = query.contains('tags', [tag])
    }

    if (scenario) {
      query = query.ilike('scenario', `%${scenario}%`)
    }

    const { data: simulations, error, count } = await query

    if (error) {
      throw error
    }

    // CSV export
    if (format === 'csv') {
      if (!simulations || simulations.length === 0) {
        return new NextResponse('No simulations found', { status: 404 })
      }

      const csvRows = []

      // Header
      csvRows.push([
        'ID',
        'Created At',
        'Scenario',
        'Turns',
        'Total Messages',
        'Mediator Messages',
        'Partner A Messages',
        'Partner B Messages',
        'Duration (s)',
        'Evaluation Score',
        'Tags'
      ].join(','))

      // Data rows
      for (const sim of simulations) {
        csvRows.push([
          sim.id,
          sim.created_at,
          `"${sim.scenario.replace(/"/g, '""')}"`, // Escape quotes
          sim.num_turns,
          sim.total_messages,
          sim.mediator_messages,
          sim.partner_a_messages,
          sim.partner_b_messages,
          sim.duration_seconds,
          sim.evaluation_score || '',
          `"${(sim.tags || []).join(', ')}"`
        ].join(','))
      }

      const csv = csvRows.join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="simulations-${Date.now()}.csv"`
        }
      })
    }

    // JSON response
    return NextResponse.json({
      simulations,
      total: count,
      limit,
      offset
    })
  } catch (error) {
    console.error('Error fetching simulations:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to fetch simulations: ${errorMessage}` },
      { status: 500 }
    )
  }
}

// PATCH /api/dev/simulations/:id - Update evaluation score/notes
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, evaluationScore, evaluationNotes, tags } = body

    if (!id) {
      return NextResponse.json(
        { error: 'Simulation ID required' },
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

    const updates: any = {}
    if (evaluationScore !== undefined) updates.evaluation_score = evaluationScore
    if (evaluationNotes !== undefined) updates.evaluation_notes = evaluationNotes
    if (tags !== undefined) updates.tags = tags

    const { data, error } = await supabase
      .from('dev_simulation_runs')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ simulation: data })
  } catch (error) {
    console.error('Error updating simulation:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Failed to update simulation: ${errorMessage}` },
      { status: 500 }
    )
  }
}

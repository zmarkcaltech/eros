import { NextResponse } from 'next/server'

// Temporary endpoint to manually trigger advice generation
export async function POST(request: Request) {
  const { conflict_id } = await request.json()

  if (!conflict_id) {
    return NextResponse.json({ error: 'conflict_id required' }, { status: 400 })
  }

  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/agent/generate-advice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ conflict_id }),
    })

    const data = await response.json()
    return NextResponse.json({ success: true, data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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

interface BatchConfig {
  simulations: SimulationConfig[]
  delayBetweenSimulations?: number // milliseconds
}

export async function POST(request: NextRequest) {
  try {
    const config: BatchConfig = await request.json()

    if (!config.simulations || config.simulations.length === 0) {
      return NextResponse.json(
        { error: 'No simulations provided' },
        { status: 400 }
      )
    }

    const delay = config.delayBetweenSimulations || 2000 // Default 2 second delay between simulations
    const results = []

    console.log(`Starting batch simulation: ${config.simulations.length} simulations`)

    for (let i = 0; i < config.simulations.length; i++) {
      const simulation = config.simulations[i]
      console.log(`\nRunning simulation ${i + 1}/${config.simulations.length}`)
      console.log(`Scenario: ${simulation.scenario}`)

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/dev/run-simulation`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(simulation)
        })

        const data = await response.json()

        if (response.ok) {
          results.push({
            index: i,
            success: true,
            simulationId: data.simulationId,
            scenario: simulation.scenario,
            metrics: data.metrics
          })
          console.log(`✓ Simulation ${i + 1} complete: ${data.metrics.totalMessages} messages in ${data.metrics.durationSeconds}s`)
        } else {
          results.push({
            index: i,
            success: false,
            scenario: simulation.scenario,
            error: data.error
          })
          console.error(`✗ Simulation ${i + 1} failed: ${data.error}`)
        }
      } catch (error) {
        results.push({
          index: i,
          success: false,
          scenario: simulation.scenario,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        console.error(`✗ Simulation ${i + 1} error:`, error)
      }

      // Wait before next simulation (unless it's the last one)
      if (i < config.simulations.length - 1) {
        console.log(`Waiting ${delay}ms before next simulation...`)
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }

    const successCount = results.filter(r => r.success).length
    const failureCount = results.filter(r => !r.success).length

    console.log(`\nBatch simulation complete: ${successCount} succeeded, ${failureCount} failed`)

    return NextResponse.json({
      success: true,
      total: config.simulations.length,
      succeeded: successCount,
      failed: failureCount,
      results
    })
  } catch (error) {
    console.error('Batch simulation error:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json(
      { error: `Batch simulation failed: ${errorMessage}` },
      { status: 500 }
    )
  }
}

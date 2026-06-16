#!/usr/bin/env tsx

/**
 * Test the enhanced simulation system with a single scenario
 */

import * as fs from 'fs'
import * as path from 'path'

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function testEnhancedSimulation() {
  // Read the enhanced scenarios
  const scenariosPath = path.resolve('examples/enhanced-test-scenarios.json')
  const config = JSON.parse(fs.readFileSync(scenariosPath, 'utf-8'))

  // Run just the first scenario (texting delay)
  const scenario = config.simulations[0]

  console.log(`🧪 Testing Enhanced Simulation System`)
  console.log(`   Scenario: ${scenario.scenario}`)
  console.log(`   Category: ${scenario.scenario_category}`)
  console.log(`   Severity: ${scenario.severity}`)
  console.log('')

  const response = await fetch(`${API_URL}/api/dev/run-simulation-enhanced`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scenario)
  })

  const result = await response.json()

  if (!response.ok) {
    console.error('❌ Simulation failed:', result.error)
    process.exit(1)
  }

  console.log('✅ Enhanced simulation complete!')
  console.log('')
  console.log('📊 Metrics:')
  console.log(`   Total messages: ${result.metrics.totalMessages}`)
  console.log(`   Duration: ${result.metrics.durationSeconds}s`)
  console.log(`   Avg AI message length: ${Math.round(result.metrics.avgAiMessageLength)} words`)
  console.log('')

  console.log('🎯 Evaluation Results:')
  console.log(`   Pass Status: ${result.evaluation.passStatus}`)
  console.log(`   Mediation Quality: ${result.evaluation.mediationQuality?.averageScore?.toFixed(2)}/5.0`)
  console.log(`   Safety Score: ${result.evaluation.safety?.safetyScore}`)
  console.log(`   Monetization: ${result.evaluation.monetization?.willingnessToPay}`)
  console.log('')

  if (result.evaluation.failureTags?.length > 0) {
    console.log('⚠️  Failure Tags:')
    result.evaluation.failureTags.forEach((tag: string) => console.log(`   - ${tag}`))
    console.log('')
  }

  if (result.evaluation.mediationQuality?.topStrengths?.length > 0) {
    console.log('💪 Top Strengths:')
    result.evaluation.mediationQuality.topStrengths.forEach((strength: string) => console.log(`   - ${strength}`))
    console.log('')
  }

  if (result.evaluation.mediationQuality?.topWeaknesses?.length > 0) {
    console.log('📝 Top Weaknesses:')
    result.evaluation.mediationQuality.topWeaknesses.forEach((weakness: string) => console.log(`   - ${weakness}`))
    console.log('')
  }

  if (result.evaluation.mediationQuality?.singleMostImportantImprovement) {
    console.log('🎯 Most Important Improvement:')
    console.log(`   ${result.evaluation.mediationQuality.singleMostImportantImprovement}`)
    console.log('')
  }

  console.log(`💾 Simulation ID: ${result.simulationId}`)
  console.log('')
  console.log('View full results:')
  console.log(`   curl http://localhost:3000/api/dev/simulations | jq '.simulations[] | select(.id == "${result.simulationId}")'`)
}

testEnhancedSimulation().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

#!/usr/bin/env tsx

/**
 * CLI script to run batch simulations for testing and evaluation
 *
 * Usage:
 *   npm run simulate -- path/to/config.json
 *   tsx scripts/run-batch-simulation.ts examples/batch-simulations.json
 */

import * as fs from 'fs'
import * as path from 'path'

const API_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

async function runBatchSimulation(configPath: string) {
  // Read config file
  const absolutePath = path.resolve(configPath)

  if (!fs.existsSync(absolutePath)) {
    console.error(`❌ Config file not found: ${absolutePath}`)
    process.exit(1)
  }

  console.log(`📄 Loading config from: ${absolutePath}`)
  const configContent = fs.readFileSync(absolutePath, 'utf-8')
  const config = JSON.parse(configContent)

  console.log(`\n🚀 Starting batch simulation`)
  console.log(`   Simulations: ${config.simulations.length}`)
  console.log(`   API URL: ${API_URL}`)
  console.log('')

  // Run batch simulation
  const response = await fetch(`${API_URL}/api/dev/batch-simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  })

  const result = await response.json()

  if (!response.ok) {
    console.error('❌ Batch simulation failed:', result.error)
    process.exit(1)
  }

  console.log('\n✅ Batch simulation complete!')
  console.log(`   Total: ${result.total}`)
  console.log(`   Succeeded: ${result.succeeded}`)
  console.log(`   Failed: ${result.failed}`)
  console.log('')

  // Print results summary
  console.log('Results:')
  console.log('─'.repeat(80))

  for (const r of result.results) {
    const status = r.success ? '✓' : '✗'
    const scenarioShort = r.scenario.substring(0, 50) + (r.scenario.length > 50 ? '...' : '')

    if (r.success) {
      console.log(`${status} [${r.index + 1}] ${scenarioShort}`)
      console.log(`   Messages: ${r.metrics.totalMessages} | Duration: ${r.metrics.durationSeconds}s | ID: ${r.simulationId}`)
    } else {
      console.log(`${status} [${r.index + 1}] ${scenarioShort}`)
      console.log(`   Error: ${r.error}`)
    }
    console.log('')
  }

  // Export results to file
  const outputPath = path.join(
    path.dirname(absolutePath),
    `simulation-results-${Date.now()}.json`
  )

  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2))
  console.log(`💾 Results saved to: ${outputPath}`)
}

// Main
const configPath = process.argv[2]

if (!configPath) {
  console.error('Usage: npm run simulate -- path/to/config.json')
  process.exit(1)
}

runBatchSimulation(configPath).catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})

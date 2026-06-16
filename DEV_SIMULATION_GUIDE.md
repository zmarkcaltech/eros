# Dev Simulation System - Testing & Evaluation Guide

This guide explains how to programmatically run and evaluate conversations with different personality configurations to test the AI mediator's performance.

## Overview

The dev simulation system allows you to:
- **Programmatically run conversations** with different partner personalities
- **Store complete transcripts** in the database
- **Batch test** multiple scenarios at once
- **Export results** for analysis
- **Grade/evaluate** mediator responses

## Quick Start

### 1. Run a Single Simulation via API

```bash
curl -X POST http://localhost:3000/api/dev/run-simulation \
  -H "Content-Type: application/json" \
  -d @examples/single-simulation.json
```

### 2. Run Batch Simulations via CLI

```bash
npm run simulate -- examples/batch-simulations.json
```

### 3. View Simulation Results

```bash
# List all simulations
curl http://localhost:3000/api/dev/simulations

# Filter by tag
curl http://localhost:3000/api/dev/simulations?tag=high-conflict

# Export to CSV
curl http://localhost:3000/api/dev/simulations?format=csv > results.csv
```

---

## API Endpoints

### POST `/api/dev/run-simulation`

Run a single simulation and store results.

**Request Body:**
```json
{
  "scenario": "Disagreement about household chores",
  "numTurns": 5,
  "tags": ["household-labor", "resentment"],
  "partnerA": {
    "fullName": "Alex Test",
    "preferredName": "Alex",
    "age": 28,
    "pronouns": "they/them",
    "occupation": "Software Engineer",
    "selfDescription": "I value clear communication",
    "interests": "Hiking, cooking",
    "personality": "Introverted, analytical, conflict-avoidant",
    "hiddenTruth": "Feeling burnt out at work",
    "enthusiasmLevel": "medium",
    "communicationStyle": "Logical and measured"
  },
  "partnerB": {
    "fullName": "Jordan Test",
    "preferredName": "Jordan",
    "age": 30,
    "pronouns": "she/her",
    "occupation": "Graphic Designer",
    "selfDescription": "I'm creative and emotional",
    "interests": "Art, yoga",
    "personality": "Extroverted, expressive",
    "hiddenTruth": "Worried Alex is pulling away",
    "enthusiasmLevel": "high",
    "communicationStyle": "Emotional and direct"
  },
  "relationship": {
    "durationMonths": 24,
    "description": "Together 2 years, struggle with communication",
    "goals": "Improve communication patterns",
    "howWeMet": "At a coffee shop",
    "livingSituation": "Living together"
  }
}
```

**Response:**
```json
{
  "success": true,
  "simulationId": "uuid-here",
  "relationshipId": "uuid-here",
  "transcript": [
    {
      "sender_type": "partner_a",
      "content": "I've been feeling overwhelmed...",
      "created_at": "2026-06-14T..."
    },
    {
      "sender_type": "ai",
      "content": "Alex, I hear that you're feeling overwhelmed...",
      "created_at": "2026-06-14T..."
    }
  ],
  "metrics": {
    "totalMessages": 15,
    "partnerAMessages": 5,
    "partnerBMessages": 5,
    "mediatorMessages": 5,
    "durationSeconds": 65
  }
}
```

---

### POST `/api/dev/batch-simulate`

Run multiple simulations in sequence.

**Request Body:**
```json
{
  "delayBetweenSimulations": 3000,
  "simulations": [
    { /* simulation config 1 */ },
    { /* simulation config 2 */ },
    { /* simulation config 3 */ }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "total": 3,
  "succeeded": 3,
  "failed": 0,
  "results": [
    {
      "index": 0,
      "success": true,
      "simulationId": "uuid",
      "scenario": "Disagreement about...",
      "metrics": { "totalMessages": 15, ... }
    }
  ]
}
```

---

### GET `/api/dev/simulations`

Retrieve stored simulation runs.

**Query Parameters:**
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)
- `tag` - Filter by tag
- `scenario` - Search scenario text
- `format` - Output format: `json` or `csv`

**Examples:**
```bash
# Get latest 10 simulations
curl http://localhost:3000/api/dev/simulations?limit=10

# Get high-conflict scenarios
curl http://localhost:3000/api/dev/simulations?tag=high-conflict

# Export all to CSV
curl http://localhost:3000/api/dev/simulations?format=csv > results.csv
```

---

### PATCH `/api/dev/simulations`

Update evaluation score/notes for a simulation.

**Request Body:**
```json
{
  "id": "simulation-uuid",
  "evaluationScore": 85,
  "evaluationNotes": "Mediator handled de-escalation well but could have asked more open-ended questions",
  "tags": ["high-conflict", "good-example"]
}
```

---

## CLI Usage

### Run Batch Simulations

```bash
npm run simulate -- path/to/config.json
```

The script will:
1. Read the config file
2. Run each simulation sequentially
3. Print progress to console
4. Save results to `simulation-results-{timestamp}.json`

### Example Output

```
📄 Loading config from: /path/to/batch-simulations.json

🚀 Starting batch simulation
   Simulations: 5
   API URL: http://localhost:3000

Running simulation 1/5
Scenario: Disagreement about household chores
✓ Simulation 1 complete: 15 messages in 65s

Running simulation 2/5
Scenario: Communication breakdown after betrayal
✓ Simulation 2 complete: 17 messages in 72s

...

✅ Batch simulation complete!
   Total: 5
   Succeeded: 5
   Failed: 0

💾 Results saved to: simulation-results-1718380800000.json
```

---

## Configuration Files

### Batch Simulation Config

See `examples/batch-simulations.json` for a complete example with 5 different scenarios:

1. **Closeness-distance conflict** - Introverted vs extroverted partners
2. **Household labor** - Resentment about chores
3. **Pursue-withdraw pattern** - One wants to talk, one avoids
4. **Financial disagreement** - Different money values
5. **Trust repair** - Emotional affair recovery

### Personality Parameters

**personality** - General traits
- Examples: "Introverted, analytical", "Extroverted, emotional", "Conflict-avoidant"

**hiddenTruth** - Secret thoughts/feelings not yet shared
- Examples: "Feeling burnt out", "Fears breakup", "Resentful about career sacrifice"

**enthusiasmLevel** - Engagement level
- `low` - Brief, withdrawn responses
- `medium` - Balanced participation
- `high` - Engaged, expressive responses

**communicationStyle** - How they communicate
- Examples: "Logical and measured", "Emotional and direct", "Passive-aggressive", "Stonewalling"

---

## Testing Scenarios

### Recommended Test Coverage

1. **Conflict Patterns**
   - Pursue-withdraw cycle
   - Attack-defend cycle
   - Mutual escalation
   - Stonewalling

2. **Emotional States**
   - High anger (both partners)
   - One angry, one withdrawn
   - Both hurt/vulnerable
   - Mixed (anger masking fear)

3. **Communication Styles**
   - Direct vs indirect
   - Emotional vs logical
   - Passive-aggressive vs assertive
   - Verbose vs minimal

4. **Complexity Levels**
   - Simple disagreement (low stakes)
   - Values conflict (medium stakes)
   - Trust betrayal (high stakes)
   - Multiple layered issues

---

## Evaluation Criteria

When grading simulations, consider:

### Mediator Performance

1. **Flow Control** (0-20 points)
   - Always addresses one partner at a time?
   - Uses names correctly?
   - Balances turn-taking?

2. **De-escalation** (0-20 points)
   - Calms heightened emotions?
   - Reframes attacks into feelings/needs?
   - Prevents escalation spiral?

3. **Balance** (0-20 points)
   - Equal airtime for both partners?
   - Validates both perspectives?
   - Doesn't take sides?

4. **Depth** (0-20 points)
   - Identifies underlying emotions?
   - Names the cycle?
   - Finds softer truth under anger?

5. **Progress** (0-20 points)
   - Moves toward understanding?
   - Gets to vulnerable sharing?
   - Helps create repair?

### Example Evaluation

```bash
curl -X PATCH http://localhost:3000/api/dev/simulations \
  -H "Content-Type: application/json" \
  -d '{
    "id": "simulation-uuid",
    "evaluationScore": 85,
    "evaluationNotes": "Excellent de-escalation in turn 3. Could improve by asking more open-ended questions.",
    "tags": ["high-conflict", "good-example", "pursue-withdraw"]
  }'
```

---

## Database Schema

Simulations are stored in `dev_simulation_runs` table:

```sql
CREATE TABLE dev_simulation_runs (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ,
  scenario TEXT,
  num_turns INTEGER,
  partner_a_config JSONB,
  partner_b_config JSONB,
  relationship_config JSONB,
  relationship_id UUID,
  transcript JSONB,
  total_messages INTEGER,
  mediator_messages INTEGER,
  partner_a_messages INTEGER,
  partner_b_messages INTEGER,
  duration_seconds INTEGER,
  evaluation_score DECIMAL,
  evaluation_notes TEXT,
  tags TEXT[]
);
```

---

## Tips for Effective Testing

1. **Vary personalities systematically**
   - Test all combinations of enthusiasm levels (low-low, low-high, etc.)
   - Test different communication style pairings
   - Include diverse hidden truths

2. **Tag thoughtfully**
   - Use consistent tags for filtering
   - Examples: "high-conflict", "pursue-withdraw", "good-example", "needs-work"

3. **Review transcripts manually**
   - Automated metrics only tell part of the story
   - Read actual mediator responses for quality

4. **Look for patterns**
   - Does mediator struggle with certain personality types?
   - Which conflict patterns are handled well?
   - Where does flow control break down?

5. **Iterate on prompts**
   - Use insights to improve mediator system prompt
   - Re-run same scenarios after changes to compare

---

## Exporting & Analysis

### Export to CSV

```bash
curl http://localhost:3000/api/dev/simulations?format=csv > results.csv
```

CSV includes:
- ID, Created At, Scenario
- Turn count, message counts
- Duration, evaluation score
- Tags

### Export to JSON

```bash
curl http://localhost:3000/api/dev/simulations?limit=1000 > all-simulations.json
```

JSON includes full transcripts for detailed analysis.

### Analysis Tools

Use the exported data with:
- Python/Pandas for statistical analysis
- Excel for manual review
- Custom scripts for pattern detection

---

## Troubleshooting

**Simulations timing out:**
- Reduce `numTurns`
- Increase `delayBetweenSimulations`
- Check API rate limits

**Poor quality responses:**
- Ensure personality configs are detailed
- Check that scenario is clear
- Verify hidden truths are realistic

**Database errors:**
- Run migrations: Check Supabase for migration status
- Verify service role key is set

**API errors:**
- Check dev server is running
- Verify `NEXT_PUBLIC_APP_URL` env variable
- Check logs for detailed errors

---

## Next Steps

1. Run the example batch: `npm run simulate -- examples/batch-simulations.json`
2. Review results in the database
3. Create your own test scenarios
4. Evaluate and iterate on mediator prompts
5. Export results for analysis

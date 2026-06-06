import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

// Use Claude Opus 4.5 - the most capable model for nuanced therapeutic advice
export const CLAUDE_MODEL = 'claude-opus-4-5-20251101'

export const AGENT_CONFIG = {
  model: CLAUDE_MODEL,
  max_tokens: 4096,
  temperature: 0.7, // Balanced between creativity and consistency
}

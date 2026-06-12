# Chat Simulator CLI

Test the AI mediator programmatically from the command line.

## Setup

1. Make sure your `.env.local` has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   ANTHROPIC_API_KEY=your-key
   ```

2. Install tsx if you haven't:
   ```bash
   npm install -D tsx
   ```

## Usage

### Basic simulation (creates test relationship, runs 6 turns):
```bash
npx tsx scripts/test-chat-simulator.ts
```

### With a specific scenario:
```bash
npx tsx scripts/test-chat-simulator.ts --scenario "Disagreement about household chores"
```

### More turns:
```bash
npx tsx scripts/test-chat-simulator.ts --turns 10
```

### Use existing relationship:
```bash
npx tsx scripts/test-chat-simulator.ts --relationship-id <uuid> --turns 8
```

### Quiet mode (less output):
```bash
npx tsx scripts/test-chat-simulator.ts --quiet
```

### All options together:
```bash
npx tsx scripts/test-chat-simulator.ts \
  --scenario "Work-life balance conflict" \
  --turns 12 \
  --relationship-id abc-123-def
```

## What it does

1. Creates a test relationship (or uses existing one)
2. Generates realistic partner messages using Claude Opus 4
3. Sends messages alternating between partners
4. Waits for AI mediator responses
5. Prints full conversation to console with color-coded output

## Output Example

```
🚀 Starting Chat Simulation

📝 Creating test relationship...
✅ Created relationship: abc-123-def
   Partner A: Alex (cli-test-a-123@example.com)
   Partner B: Jordan (cli-test-b-123@example.com)

📋 Scenario: Disagreement about household chores

💬 Conversation:

[10:30:15] Alex: I've been feeling overwhelmed lately with how the chores are distributed. It feels like I'm doing most of the cleaning.
[10:30:18] AI Mediator: Thank you for sharing that, Alex. I hear that you're feeling overwhelmed...
[10:30:22] Jordan: I understand, but I've been really swamped at work this month. I'm not trying to avoid chores.
[10:30:25] AI Mediator: Jordan, I appreciate you providing context...

✅ Simulation complete!

📊 Stats:
   Relationship ID: abc-123-def
   Total turns: 6
   Scenario: Disagreement about household chores
```

## Tips

- Use `--scenario` to test how the mediator handles specific conflicts
- Use `--turns 10` or more for longer conversations
- The script creates realistic partner profiles automatically
- Messages are color-coded: Magenta (Partner A), Cyan (Partner B), Blue (AI Mediator)

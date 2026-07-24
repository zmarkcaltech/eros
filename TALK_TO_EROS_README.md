# Talk to Eros - Standalone AI Relationship Counselor

## Overview

This is a complete rebuild of the AI conversation feature. Instead of being tied to conflict mediation, "Talk to Eros" is now a standalone, general-purpose relationship counseling chatbot accessible anytime from the dashboard.

## What Changed

### **REMOVED:**
- ❌ Conflict-linked solo conversations
- ❌ Solo conversation created after intake submission
- ❌ Old `solo_conversations` and `solo_conversation_messages` tables (now deprecated)

### **NEW:**
- ✅ Standalone "Talk to Eros" feature (not tied to conflicts)
- ✅ Discovery-based conversation flow
- ✅ Multi-phase AI prompting
- ✅ Context tracking (learns as conversation progresses)
- ✅ Prominent dashboard access button

## Features

### **Discovery Phase** (First 6 messages)
Eros naturally learns:
1. Recent relationship events
2. User's goals for the conversation
3. Relationship goals
4. Safety check
5. Relevant history
6. De-escalation preferences

### **Goal-Based Support** (After discovery)
Based on what it learns, Eros adapts to help with:
- **Message Crafting** - Draft copyable text messages to send partner (📱 format)
- **Perspective Taking** - Understand partner's viewpoint
- **Emotional Processing** - Process feelings and gain clarity
- **Readiness Assessment** - Decide if ready to discuss with partner

### **AI Conversation Flow**
- Warm, empathetic tone
- One question at a time (not interrogating)
- Validates feelings before exploring
- 3-5 sentence responses (concise but supportive)
- Adapts based on user needs

## Database Schema

### New Tables

**`eros_conversations`** - One per user
```sql
- id, user_id, relationship_id
- recent_events TEXT
- conversation_goals TEXT[]
- relationship_goals TEXT[]
- safety_checked BOOLEAN
- safety_concerns TEXT
- relevant_history TEXT
- deescalation_preferences JSONB
- status, last_message_at, created_at, updated_at
```

**`eros_conversation_messages`**
```sql
- id, conversation_id, sender_type ('user' | 'ai'), content
- model_version, prompt_type
- created_at
```

## How to Set Up

### 1. Run Migration

Go to Supabase SQL Editor and run:
`supabase/migrations/20260628000001_create_eros_conversations.sql`

### 2. Deploy Code

The code is already committed and ready to deploy.

### 3. Test

1. Go to dashboard
2. Click "Talk to Eros" button at the top
3. Eros will greet you and ask about recent events
4. Have a conversation - Eros will adapt to your needs

## File Structure

```
src/app/(app)/eros/
├── page.tsx                    # Server component (loads conversation)
└── ErosConversationClient.tsx  # Client component (chat UI)

src/app/api/eros/conversation/
└── route.ts                    # GET (load) and POST (send message)

supabase/migrations/
└── 20260628000001_create_eros_conversations.sql
```

## Example Conversation Flow

**Eros:** "Hi Sarah 👋 Has anything happened recently in your relationship that you'd like to talk about?"

**User:** "Yes, we had a fight about household chores yesterday"

**Eros:** "I'm sorry you're going through that. Disagreements about household responsibilities can be really frustrating. What's the main thing you need your partner to understand about this situation?"

**User:** "I just need them to see how overwhelmed I am"

**Eros:** "That feeling of being overwhelmed is so valid. It sounds like you want them to really see and acknowledge what you're carrying. Would it help if we drafted a message you could send them that expresses this without sounding blaming?"

**User:** "Yes please"

**Eros:** [Presents 3 copyable message options with 📱 emoji]

## What Happens to Old Solo Conversations?

The old `solo_conversations` and `solo_conversation_messages` tables still exist but are no longer used. They can be deprecated in a future cleanup.

The conflict mediation system no longer creates solo conversations after intake submission.

## Next Steps

After testing, consider:
- Adding conversation history view
- Allowing users to start new conversations
- Adding export/share conversation feature
- Enhanced context detection (using AI to extract goals from messages)

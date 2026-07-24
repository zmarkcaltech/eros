# Multi-Conversation System for Talk to Eros

## What Changed

### **OLD SYSTEM:**
- ❌ One continuous conversation per user
- ❌ No way to start fresh conversations
- ❌ All topics mixed together

### **NEW SYSTEM:**
- ✅ Unlimited separate conversations
- ✅ Each conversation auto-named by AI after 4 messages
- ✅ Dashboard shows list of all conversations
- ✅ Click to resume any past conversation
- ✅ "Talk to Eros" button always starts a NEW conversation

---

## Features

### **1. Auto-Naming**
- After 4 messages (2 exchanges), AI automatically generates a descriptive name
- Examples: "Household chore disagreement", "Communication about intimacy"
- 3-6 words, focused on topic not emotion
- Appears in conversation list on dashboard

### **2. Conversation List**
- Dashboard shows up to 10 recent conversations
- Displays: name, message count, last message date
- Click any conversation to resume it
- Hover effect for easy navigation

### **3. Separate Topics**
- Each conversation is independent
- Perfect for discussing different issues
- Keep relationship topics organized
- No context bleeding between conversations

---

## How It Works

### **Starting a New Conversation**
1. Go to dashboard
2. Click "Talk to Eros" (purple button)
3. Automatically creates a NEW conversation
4. Eros greets you and starts discovery

### **Resuming a Conversation**
1. Go to dashboard
2. Look for "Recent Conversations with Eros" section
3. Click on any conversation
4. Opens exactly where you left off

### **Conversation Naming**
- Happens automatically after 4 messages
- AI analyzes first few messages
- Generates concise, descriptive name
- Updates in real-time on dashboard

---

## Database Changes

### New Migration: `20260629000001_multi_conversation_support.sql`

**Changes:**
1. Removed unique constraint (allows multiple conversations per user)
2. Added `conversation_name` field
3. Added `auto_named` boolean (tracks if AI named it)
4. Added `message_count` integer (tracks conversation length)
5. Updated status constraint (added 'archived')

---

## API Routes

### **GET /api/eros/conversations**
Lists all conversations for current user
- Returns: id, name, status, message count, timestamps
- Ordered by most recent first

### **POST /api/eros/conversation**
Send message in conversation
- Auto-names conversation after 4 messages
- Updates message count
- Increments last_message_at

### **GET /eros**
Always creates a NEW conversation
- Inserts new row in eros_conversations
- Creates opening AI message
- Redirects to conversation

### **GET /eros/[id]**
Resume a specific conversation
- Loads conversation by ID
- Fetches all messages
- Verifies user ownership

---

## UI Changes

### **Dashboard**
- Added "Recent Conversations with Eros" section
- Shows list of conversations with:
  - AI-generated name (or "New conversation")
  - Message count
  - Last message date
- Click to resume any conversation

### **Talk to Eros Button**
- Still prominent at top of dashboard
- Now creates NEW conversation every time
- No longer resumes old conversation

---

## Example User Flow

**Day 1:**
1. User clicks "Talk to Eros"
2. Discusses household chores
3. After 4 messages, conversation auto-named "Household responsibility discussion"
4. Clicks home button
5. Dashboard shows conversation in list

**Day 2:**
1. User clicks "Talk to Eros" again
2. Discusses communication issues
3. After 4 messages, auto-named "Communication patterns with partner"
4. User now sees 2 conversations in dashboard

**Day 3:**
1. User clicks on "Household responsibility discussion" to resume
2. Continues exactly where they left off
3. Can switch between conversations anytime

---

## Technical Details

### **Auto-Naming Logic**
```typescript
// Triggers after message count reaches 4
if (!conversation.auto_named && newMessageCount >= 4) {
  generateConversationName(conversationId, messages, supabase);
}
```

### **AI Naming Prompt**
- Analyzes first 6 messages
- Generates 3-6 word name
- Focuses on topic, not emotion
- Strips quotes and punctuation
- Fallback: "Conversation with Eros"

### **Database Indexes**
- `idx_eros_conversations_user_created` - Fast listing by user
- Optimized for fetching recent conversations

---

## Migration Instructions

### **Run This Migration:**
`supabase/migrations/20260629000001_multi_conversation_support.sql`

1. Go to Supabase SQL Editor
2. Copy the entire migration
3. Paste and run
4. Expected: "Success. No rows returned"

---

## Testing

### **Test New Conversation:**
1. Click "Talk to Eros" on dashboard
2. Type 3-4 messages
3. Check dashboard - should see auto-named conversation

### **Test Resume:**
1. Go to dashboard
2. Click on a conversation in the list
3. Should resume with all messages
4. Send a new message - should save correctly

### **Test Multiple Conversations:**
1. Create 3 different conversations
2. Dashboard should show all 3
3. Click between them - each should maintain its own context

---

## Files Changed

**Database:**
- `supabase/migrations/20260629000001_multi_conversation_support.sql`

**API Routes:**
- `src/app/api/eros/conversation/route.ts` (added auto-naming)
- `src/app/api/eros/conversations/route.ts` (NEW - list endpoint)

**Pages:**
- `src/app/(app)/eros/page.tsx` (always creates new)
- `src/app/(app)/eros/[id]/page.tsx` (NEW - resume page)
- `src/app/(app)/dashboard/page.tsx` (added conversation list)

**Client:**
- `src/app/(app)/eros/ErosConversationClient.tsx` (no changes)

---

## Benefits

✅ Organized topic separation
✅ Easy to find past conversations
✅ Natural conversation flow
✅ AI does the naming work
✅ Unlimited conversations
✅ No context confusion

---

**Ready to deploy!** Run the migration and test it out.

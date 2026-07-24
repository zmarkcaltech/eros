# Fix Solo Conversation Messages RLS Policy

## The Problem

When Partner 1 completes the intake form, they're redirected to a private solo conversation with Eros (the AI mediator). However, the AI wasn't responding because of this error:

```
Error creating opening message: {
  code: '42501',
  message: 'new row violates row-level security policy for table "solo_conversation_messages"'
}
```

**Root Cause:** The RLS (Row Level Security) policy on `solo_conversation_messages` only allowed users to insert messages where `auth.uid()` matches the conversation owner. This works for user messages, but **server-side code creating AI messages doesn't have auth.uid()** - it runs with service role credentials.

## The Solution

The migration `20260627000001_fix_solo_messages_rls.sql` updates the INSERT policy to allow:

1. ✅ **Users** can insert their own messages (`sender_type = 'user'`) in their conversations
2. ✅ **Server** (API routes) can insert AI messages (`sender_type = 'ai'`) for any conversation

## How to Run

1. Go to your Supabase dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20260627000001_fix_solo_messages_rls.sql`
4. Paste and run the query
5. You should see: "Success. No rows returned"

## After Running

This will fix:
- ✅ Opening AI message appears when solo conversation starts
- ✅ AI responds to user messages with message drafting suggestions
- ✅ Copy buttons work for 📱 message drafts
- ✅ Partner 2 gets notified when Partner 1 completes intake

## Test After Migration

1. Start a new mediation as Partner 1
2. Complete the intake form
3. You should immediately see Eros's opening message in the solo conversation
4. Type a message like "I'm feeling frustrated"
5. Eros should respond with 2-3 copyable message drafts
6. Partner 2 should see notification and active mediation on dashboard

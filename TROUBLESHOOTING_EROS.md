# Troubleshooting: Talk to Eros Not Responding

## Most Likely Issue: Migration Not Run

The most common reason the AI doesn't respond is that the database tables don't exist yet.

---

## Quick Check (Run This First)

**1. Go to Supabase SQL Editor**

**2. Run this query:**
```sql
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('eros_conversations', 'eros_conversation_messages');
```

**3. Expected Results:**
- ✅ **2 rows returned** → Tables exist, migration was run
- ❌ **0 rows returned** → Tables don't exist, you need to run the migration

---

## If Tables Don't Exist: Run the Migration

**1. Go to Supabase SQL Editor**

**2. Run this migration:**
`supabase/migrations/20260628000001_create_eros_conversations.sql`

Copy the entire file and paste it into the SQL editor.

**3. Expected Output:**
"Success. No rows returned" (this is normal - it's creating tables)

---

## If Tables DO Exist: Check Browser Console

**1. Open Talk to Eros page:**
Go to `/eros` in your app

**2. Open Browser Console:**
Press F12 or right-click → Inspect → Console tab

**3. Type a message and send it**

**4. Look for logs:**
- "Sending message to API..."
- "API response status: XXX"
- Any red errors

**5. Share the error with me**

---

## If Still Having Issues: Check Vercel Logs

**1. Go to:** https://vercel.com/[your-project]/logs

**2. Send a message in Talk to Eros**

**3. Look for:**
- "Saving user message for conversation: ..."
- "Error saving user message: ..."
- "Error saving AI message: ..."
- "row violates row-level security policy"

**4. Share the specific error**

---

## Common Errors & Fixes

### Error: "table eros_conversations does not exist"
**Fix:** Run the migration (see above)

### Error: "row violates row-level security policy"
**Fix:** RLS policy issue. Let me know and I'll create a fix.

### Error: "ANTHROPIC_API_KEY is not set"
**Fix:**
1. Go to Vercel → Your Project → Settings → Environment Variables
2. Add `ANTHROPIC_API_KEY` with your Anthropic API key
3. Redeploy

### AI responds but messages don't appear
**Fix:** Realtime subscription issue
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)
- Check browser console for subscription errors

---

## Test Files Created

I've created some helper files for you:

1. **`check_eros_tables.sql`** - Quick check if tables exist
2. **`TROUBLESHOOTING_EROS.md`** - This file
3. **`TALK_TO_EROS_README.md`** - Full feature documentation

---

## Next Steps

1. ✅ Run `check_eros_tables.sql` to verify table status
2. ✅ If needed, run the migration
3. ✅ Test Talk to Eros
4. ✅ If still broken, check browser console and share errors

Let me know what you find!

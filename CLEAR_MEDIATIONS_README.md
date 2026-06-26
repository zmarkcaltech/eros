# Clear Old Mediations

This script clears all existing conflict mediations to allow testing of the new AI features with fresh data.

## Why Clear Old Mediations?

Old mediations created before the recent updates:
- ❌ Don't have AI-generated conflict names
- ❌ Don't have de-escalatory summaries
- ❌ Don't have the message crafting coach features
- ❌ May have incomplete notification setup

## What Gets Deleted

Running `clear_old_mediations.sql` will delete:
- ✅ All conflict incidents
- ✅ All conflict intake responses (CASCADE)
- ✅ All solo conversations (CASCADE)
- ✅ All solo conversation messages (CASCADE)
- ✅ All conflict safety evaluations (CASCADE)

## What's Preserved

The script does NOT delete:
- ✅ User profiles
- ✅ Relationships
- ✅ Photos
- ✅ Messages (relationship chat)
- ✅ Love Map sessions/data
- ✅ Notifications (they'll just have no related conflicts)

## How to Run

1. Go to your Supabase dashboard
2. Navigate to SQL Editor
3. Copy the contents of `clear_old_mediations.sql`
4. Paste and run the query
5. Verify the output shows 0 remaining rows in all tables

## After Clearing

You can now test the complete mediation flow:
1. Partner 1 starts a mediation
2. Partner 1 completes intake → AI generates summary and conflict name
3. Partner 2 sees notification
4. Partner 2 completes intake → sees AI summary (not raw text)
5. Both partners get solo conversations with message crafting coach
6. Safety evaluation runs
7. Recommendation is generated

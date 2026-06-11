# Claude Code Instructions: Build “MapQuest for Couples” Love Maps Game for Eros

## Product Context

Eros is an AI couples-support app designed to help partners strengthen their relationship through structured exercises, games, and guided conversations. One core game should be a Love Maps–inspired exercise called **MapQuest for Couples**. The game helps partners learn and update their understanding of each other’s inner world: preferences, daily stress, emotional needs, affection preferences, history, dreams, vulnerabilities, conflict patterns, and playful quirks.

The game should feel warm, playful, emotionally intelligent, and nonjudgmental. It should not feel like a clinical test or a compatibility exam. The main purpose is to create curiosity, connection, and discovery between partners.

## Core Design Principle

The game should reward both **knowing** and **learning**.

A correct guess is good because it shows attunement. An incorrect guess is also good because it reveals new information and updates the couple’s “map.” Wrong answers should never be framed as failures. They should be framed as discoveries.

Use language like:

- “Map updated.”
- “New territory discovered.”
- “That answer added new detail to your shared map.”
- “A missed guess may mean your partner has changed, not that you failed.”

Avoid language like:

- “You failed.”
- “You don’t know your partner.”
- “Bad answer.”
- “Partner A is winning and Partner B is losing.”

## Game Summary

Create a couples game called **MapQuest for Couples**. Each round, one partner privately answers a question about their inner world. The other partner guesses the answer. The original partner reveals the answer, rates how close the guess was, and may add clarification. The app then prompts a short reflection or validation moment before switching roles.

The game should include multiple categories, short sessions, playful scoring, optional depth levels, skip buttons, and an end-of-session summary that captures what the couple learned and suggests one tiny action for the next 48 hours.

## Target User Experience

The experience should feel like a mix of:

- relationship trivia;
- emotional check-in;
- newlywed game;
- cozy adventure map;
- guided communication practice.

The tone should be warm, playful, and lightly humorous. Eros should behave like a kind game host who protects emotional safety.

Example tone:

- “Tiny cartographers, ready?”
- “Welcome to Stress Swamp. Proceed gently.”
- “New territory discovered.”
- “That answer deserves a gold star and possibly snacks.”
- “Map updated: your partner feels most supported when you ask before giving advice.”

## Game Modes

Implement at least these modes:

### 1. Daily Love Map

A very short daily version.

- Duration: 2–4 minutes.
- One question per partner.
- Low friction.
- Best for ongoing engagement.

### 2. Date Night Love Map

A longer, more playful version.

- Duration: 10–15 minutes.
- Three to six questions per partner.
- Mix of playful, affectionate, and lightly vulnerable prompts.

### 3. Repair Love Map

A version focused on support, stress, conflict, and repair.

- Duration: 8–12 minutes.
- Questions about stress, apology preferences, support needs, escalation triggers, and post-conflict reconnection.
- Should be gentle and should include pause/skip options.

### 4. Patch Notes

A monthly or occasional update mode.

- Theme: “You are not dating the old version of your partner. Time for patch notes.”
- Focuses on what has changed recently.
- Helps couples update stale assumptions.

Example prompts:

- “One thing I like more than I used to is…”
- “One thing I care less about now is…”
- “One new stressor in my life is…”
- “One way I’ve changed as a partner is…”
- “One thing I need more of lately is…”
- “One thing I want you to stop assuming about me is…”

## Round Flow

Each round should follow this structure:

### Step 1: Select the answering partner

Alternate partners each round.

Example:

```text
Round 1: Partner A answers privately. Partner B guesses.
Round 2: Partner B answers privately. Partner A guesses.
```

### Step 2: Ask a private question

Eros shows the answering partner a question privately.

Example:

```text
Partner A, secretly answer this:
“What is one thing currently stressing you that Partner B may not fully realize?”
```

The answering partner types their private answer.

### Step 3: Ask the other partner to guess

The guessing partner sees the question but not the answer.

Example:

```text
Partner B, what do you think Partner A wrote?
Guess with kindness. The goal is curiosity, not perfection.
```

Partner B submits a guess.

### Step 4: Reveal and rate closeness

Show the answering partner the guess and ask them to rate it.

Rating options:

- Nailed it — 3 Map Points
- Pretty close — 2 Map Points
- Partly right — 1 Map Point
- New discovery — 0 Map Points, but 2 Discovery Points
- I want to explain — open clarification flow

Important: “New discovery” should sound positive, not like a failure.

### Step 5: Clarification

Allow the answering partner to add context.

Prompt:

```text
What would you like your partner to understand about your answer?
```

Optional short answer field.

### Step 6: Reflection or validation

Eros prompts the guessing partner to reflect back what they learned.

Example prompts:

```text
Reflect this back in one sentence, starting with “I didn’t realize…”
```

or:

```text
Validate your partner’s answer in one sentence, starting with “It makes sense that…”
```

or:

```text
Ask one curious follow-up question. No fixing yet.
```

### Step 7: Award Care Coins

Award Care Coins for emotionally skillful responses.

Possible Care Coin triggers:

- accurate reflection;
- validation;
- curious follow-up;
- nondefensive response;
- gentle repair attempt;
- appreciation.

This can be simple at first: allow the answering partner to mark whether the reflection felt good.

Options:

- “That felt good” — +1 Care Coin
- “Almost” — no penalty
- “Try again” — Eros gives a rewrite suggestion

### Step 8: Switch roles

Move to the next round with the other partner answering privately.

## Scoring

Use three scoring concepts:

### Map Points

For accurate guesses.

- Nailed it: +3
- Pretty close: +2
- Partly right: +1
- New discovery: +0

### Discovery Points

For learning something new.

- Partner says “I didn’t know that”: +2
- Partner says “that changed recently”: +2
- Partner marks “I want to remember this”: +3

### Care Coins

For emotionally skillful interactions.

- Reflecting accurately: +1
- Validating: +1
- Asking a curious follow-up: +1
- Avoiding defensiveness: +1
- Making a specific supportive offer: +1

Do not emphasize individual winner/loser dynamics. Prefer shared session stats:

```text
Tonight you added 7 new details to your shared map.
You confirmed 5 things you already knew.
You earned 4 Care Coins by reflecting and validating each other.
```

## Session End Summary

At the end of each session, Eros should summarize:

1. New things each partner learned.
2. Existing knowledge that was confirmed.
3. Emotional themes that appeared.
4. One tiny action for the next 48 hours.

Example:

```text
MapQuest complete.

Tonight you learned:
1. Partner A wants more decompression time after work.
2. Partner B feels most loved by specific compliments.
3. Both of you want more low-pressure time together.

Tiny action for the next 48 hours:
Choose one phone-free dinner or send one specific appreciation text.
```

The action should be concrete, small, and realistic.

## Categories

Implement categories as themed “regions” of the relationship map.

### Snack Village / Daily Life

Low-stakes preferences, routines, and current habits.

Example questions:

- “What is your partner’s current favorite snack or drink?”
- “What show, podcast, song, or YouTube channel is your partner into right now?”
- “What is one errand or task your partner has been avoiding?”
- “What time of day is your partner usually most relaxed?”
- “What is one small thing that improves your partner’s mood?”
- “What is one thing your partner complains about repeatedly but secretly enjoys?”

### Stress Swamp / Stress and Support

Current burdens and preferred support.

Example questions:

- “What is your partner most stressed about this week?”
- “What is one thing your partner wishes they had more help with?”
- “When your partner is overwhelmed, do they usually want advice, comfort, space, or distraction?”
- “What is one phrase that usually helps soothe your partner?”
- “What kind of support tends to annoy your partner?”
- “What is one sign your partner is more stressed than they are admitting?”

### Affection Harbor / Affection and Romance

Love, connection, and feeling chosen.

Example questions:

- “What makes your partner feel most loved?”
- “What kind of compliment lands best for your partner?”
- “What kind of physical affection does your partner like most?”
- “What is one romantic gesture your partner would actually appreciate?”
- “What is one small thing you do that makes your partner feel chosen?”
- “What is something your partner wishes happened more often between you two?”

### Memory Mountain / History

Nostalgia, past experiences, and formative moments.

Example questions:

- “What is one early memory from the relationship your partner still cherishes?”
- “What is one hard moment your partner is proud you got through together?”
- “What was one of your partner’s favorite childhood activities?”
- “Who had a major influence on your partner growing up?”
- “What is a story from your partner’s past that shaped how they love now?”
- “What old version of themselves does your partner sometimes miss?”

### Dream Desert / Dreams and Identity

Values, goals, fears, and future vision.

Example questions:

- “What is one dream your partner still has?”
- “What is something your partner would do if they were not afraid?”
- “What kind of life does your partner secretly imagine five years from now?”
- “What is one value your partner refuses to compromise on?”
- “What is something your partner wants to become better at?”
- “What would make your partner feel more alive?”

### Comfort Cave / Conflict and Repair

Conflict style, apology, repair, and reconnection.

Example questions:

- “During conflict, does your partner usually pursue, withdraw, defend, explain, fix, or shut down?”
- “What does your partner need after an argument?”
- “What apology style works best for your partner?”
- “What is one phrase that escalates your partner?”
- “What is one phrase that helps calm your partner?”
- “What does your partner wish you understood during fights?”

### Weird Woods / Play and Humor

Silly, weird, and playful knowledge.

Example questions:

- “What animal matches your partner’s personality today?”
- “What fictional character would your partner be friends with?”
- “What is your partner’s most irrational pet peeve?”
- “What food would your partner eat every day if nutrition did not exist?”
- “What minor inconvenience makes your partner dramatically upset?”
- “What is your partner’s villain origin story this week?”

## Depth Levels

Allow users to choose a depth before a session.

### Light

Use easy, playful, low-risk questions.

Good for:

- new couples;
- tired couples;
- couples trying Eros for the first time;
- daily check-ins.

### Medium

Use a mix of support, affection, dreams, and current stress.

Good for:

- established couples;
- date nights;
- couples who want connection without heavy conflict work.

### Deep

Use more vulnerable questions about fears, identity, insecurity, longing, and conflict.

Deep mode must require both partners to opt in.

Add a consent screen:

```text
Deep Mode can include vulnerable questions. You can skip anything. Skipping is not a penalty.
Do both partners want to continue?
```

Buttons:

- “Yes, continue”
- “Keep it medium”
- “Switch to light”

## Skip and Pause Rules

Every question should have a skip option.

Skipping should not cause a penalty.

Use copy like:

```text
Skip this one — no penalty.
```

Add a pause button during the reveal/reflection stage:

```text
Pause. I need a moment.
```

If paused, Eros should respond:

```text
No problem. Take a breath. You can continue, switch to a lighter question, or end the session.
```

Options:

- Continue
- Lighter question
- End session

## Safety and Abuse Boundary

MapQuest is for relationship-building, not for unsafe relationships.

Before conflict-related or deep sessions, include a gentle safety check:

```text
This game works best when both partners feel safe to answer honestly.
If either of you feels afraid, pressured, threatened, monitored, or unable to say no, pause this exercise and seek individual support.
```

Do not force couples into vulnerability.

Do not let one partner use the game to interrogate, shame, control, or monitor the other.

If a partner writes something aggressive or shaming, Eros should intervene.

Example harmful input:

```text
See, this proves you don’t know me at all.
```

Eros response:

```text
Pause. Love Maps are built through updates, not tests. Try saying: “I realize I wanted you to know this, and I’d like to tell you now.”
```

Example harmful input:

```text
You always get this wrong because you’re selfish.
```

Eros response:

```text
Let’s slow this down. Try naming the feeling and the wish without labeling your partner. For example: “I felt hurt that this was missed, and I wish this part of me felt more known.”
```

## AI Moderation Behavior

Eros should:

- encourage curiosity;
- reward validation;
- normalize wrong guesses;
- gently rewrite blaming statements;
- suggest softer language;
- prevent score-shaming;
- avoid taking sides;
- remind partners that the shared enemy is disconnection, not each other.

Eros should not:

- diagnose either partner;
- declare who is right;
- pressure vulnerability;
- frame missed guesses as evidence of lack of love;
- encourage staying in unsafe situations;
- store sensitive details without clear user consent.

## Suggested Data Model

Use a simple model that can be adapted to the existing codebase.

### Partner

```ts
type Partner = {
  id: string;
  displayName: string;
};
```

### LoveMapQuestion

```ts
type LoveMapQuestion = {
  id: string;
  category: LoveMapCategory;
  depth: 'light' | 'medium' | 'deep';
  prompt: string;
  followUpPrompt?: string;
  allowPrivateReflectionOnly?: boolean;
};
```

### LoveMapCategory

```ts
type LoveMapCategory =
  | 'daily_life'
  | 'stress_support'
  | 'affection_romance'
  | 'history'
  | 'dreams_identity'
  | 'conflict_repair'
  | 'play_humor'
  | 'patch_notes';
```

### LoveMapRound

```ts
type LoveMapRound = {
  id: string;
  questionId: string;
  answeringPartnerId: string;
  guessingPartnerId: string;
  privateAnswer: string;
  guess: string;
  closenessRating?: 'nailed_it' | 'pretty_close' | 'partly_right' | 'new_discovery' | 'want_to_explain';
  clarification?: string;
  reflection?: string;
  careCoinAwarded?: boolean;
};
```

### LoveMapSession

```ts
type LoveMapSession = {
  id: string;
  mode: 'daily' | 'date_night' | 'repair' | 'patch_notes';
  depth: 'light' | 'medium' | 'deep';
  partners: Partner[];
  rounds: LoveMapRound[];
  mapPoints: Record<string, number>;
  discoveryPoints: number;
  careCoins: number;
  learnedItems: string[];
  tinyAction?: string;
  createdAt: string;
  completedAt?: string;
};
```

## UI Requirements

### Start Screen

Display:

```text
MapQuest for Couples
Build your shared map by guessing, revealing, and learning about each other.
The goal is not perfection. The goal is curiosity.
```

Allow users to choose:

- mode;
- depth;
- number of rounds;
- categories.

### Private Answer Screen

Show only to the answering partner if possible.

```text
Partner A, secretly answer:
[question]
```

Input field:

```text
Your private answer...
```

Buttons:

- Submit
- Skip
- Private reflection only

### Guess Screen

Show to the guessing partner.

```text
Partner B, what do you think Partner A wrote?
Guess with kindness.
```

Input field:

```text
Your guess...
```

Buttons:

- Submit guess
- Ask for a lighter question

### Reveal Screen

Show:

- original question;
- private answer;
- guess;
- closeness rating options.

### Reflection Screen

Prompt the guessing partner to reflect.

Example:

```text
Reflect what you learned in one sentence.
Try starting with: “I didn’t realize…” or “It makes sense that…”
```

### Summary Screen

Show:

- shared map updates;
- confirmed knowledge;
- discoveries;
- care coins;
- tiny action.

## Sample Session Script

### Opening

```text
Welcome to MapQuest.
Tonight, you are building a better map of each other’s inner world.
A correct guess earns Map Points.
A missed guess earns Discovery Points.
Either way, the map gets better.
```

### Round Example

```text
Partner A, secretly answer:
“What is one thing currently draining you more than your partner realizes?”
```

Partner A answer:

```text
I’ve been more stressed about money than I’ve admitted.
```

Eros to Partner B:

```text
What do you think Partner A wrote?
Guess with kindness. No need to be perfect.
```

Partner B guess:

```text
I think work has been draining you, especially feeling behind and not having enough quiet time.
```

Eros to Partner A:

```text
How close was that?
```

Partner A chooses:

```text
Partly right.
```

Partner A clarification:

```text
Work is part of it, but the bigger thing is money. I didn’t want to make it a big issue.
```

Eros to Partner B:

```text
Reflect that back in one sentence, starting with “I didn’t realize…”
```

Partner B reflection:

```text
I didn’t realize money had been sitting with you that much, and it makes sense that you didn’t want to turn it into a fight.
```

Eros:

```text
Map updated. +1 Map Point, +2 Discovery Points, +1 Care Coin.
```

## Question Bank

Include an initial question bank with at least these prompts.

### Daily Life

1. What is your partner’s current favorite comfort food?
2. What is their ideal lazy Sunday?
3. What is one tiny thing that improves their mood?
4. What is their favorite way to be greeted?
5. What is their most repeated complaint lately?
6. What is their current show, podcast, or music obsession?
7. What is one chore they hate most?
8. What is one errand they keep putting off?
9. What is their perfect weather?
10. What is their favorite way to spend a free hour?

### Emotional Support

11. What is stressing your partner most this week?
12. What kind of support do they want when overwhelmed?
13. What kind of support annoys them?
14. What is one sign they are secretly overloaded?
15. What phrase helps calm them?
16. What phrase makes them feel dismissed?
17. What helps them recover after a hard day?
18. What do they wish you noticed more often?
19. What makes them feel emotionally safe?
20. What makes them feel alone even when you are nearby?

### Affection and Romance

21. What compliment means the most to them?
22. What kind of touch do they like most?
23. What kind of date would they enjoy this month?
24. What makes them feel desired?
25. What makes them feel chosen?
26. What romantic gesture would feel authentic, not cheesy?
27. What do they wish happened more spontaneously?
28. What is one thing you do that makes them smile?
29. What makes them feel secure in the relationship?
30. What is one way they prefer love to be shown?

### History

31. What childhood experience shaped them?
32. Who is one person they deeply admire?
33. What was a major turning point in their life?
34. What is one memory they love from early in your relationship?
35. What is one hard thing they overcame?
36. What did they want to be when they were younger?
37. What family pattern do they not want to repeat?
38. What tradition matters to them?
39. What old version of themselves do they miss?
40. What past accomplishment are they proud of?

### Identity and Dreams

41. What is one dream they have not given up on?
42. What kind of future excites them?
43. What kind of future scares them?
44. What value matters deeply to them?
45. What do they want to be known for?
46. What do they want more of in life?
47. What do they want less of in life?
48. What is something they wish they were braver about?
49. What skill do they secretly want to develop?
50. What would make them feel more alive?

### Conflict and Repair

51. What does your partner usually do when hurt?
52. What do they need after an argument?
53. What apology style works best for them?
54. What makes them defensive?
55. What makes them shut down?
56. What makes them feel criticized?
57. What helps them re-engage?
58. What is one recurring issue they wish felt more like teamwork?
59. What is one thing they wish you understood during conflict?
60. What repair phrase would they actually appreciate?

### Deep Intimacy

61. What makes your partner feel not good enough?
62. What do they fear you will misunderstand?
63. What is hard for them to ask for?
64. What do they need but minimize?
65. What insecurity do they hide well?
66. What kind of rejection hurts them most?
67. What do they grieve?
68. What makes them feel deeply seen?
69. What part of themselves do they protect?
70. What truth would they share if they felt completely safe?

### Funny and Weird

71. What is your partner’s most irrational pet peeve?
72. What tiny inconvenience ruins their day dramatically?
73. What animal matches their personality today?
74. What fictional character would they be?
75. What is their villain origin story this week?
76. What would they buy with a surprise $100?
77. What would they ban from society if given power?
78. What topic can they rant about for 10 minutes?
79. What food do they pretend not to like but actually enjoy?
80. What is their most predictable “I’m tired” behavior?

## Acceptance Criteria

The implementation is successful if:

1. Users can start a MapQuest session.
2. Users can choose mode, depth, and number of rounds.
3. Partners alternate answering and guessing.
4. Each round includes private answer, guess, reveal, rating, clarification, and reflection.
5. The scoring system rewards accuracy, discovery, and care.
6. The app uses warm, playful, nonjudgmental language.
7. The game allows skipping and pausing without penalty.
8. Deep mode requires opt-in.
9. Conflict/repair mode includes safety language.
10. The end summary lists discoveries, confirmed knowledge, and one tiny action.
11. Wrong answers are framed as map updates, not failures.
12. The UI never creates shame, humiliation, or winner/loser pressure by default.

## Implementation Priority

Build in this order:

1. Static question bank.
2. Basic session state.
3. Partner alternation.
4. Private answer and guess flow.
5. Reveal and closeness rating.
6. Simple scoring.
7. Reflection prompt.
8. End summary.
9. Mode and depth selection.
10. Skip/pause behavior.
11. Safety language for deep and repair modes.
12. Optional polish: category map visuals, badges, animations, and playful labels.

## Final Product Feel

The finished game should make users feel:

- curious about each other;
- emotionally safer;
- gently challenged;
- playful;
- more known;
- less alone;
- motivated to do one small caring action.

The central emotional message of the game is:

```text
You do not have to know everything already. You just have to keep updating the map.
```

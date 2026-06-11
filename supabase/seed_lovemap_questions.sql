-- Seed Love Map Questions
-- Description: Initial question bank for MapQuest for Couples game (80 questions)
-- Date: 2026-06-10

-- Daily Life (Light) - 10 questions
INSERT INTO love_map_questions (category, depth, prompt) VALUES
('daily_life', 'light', 'What is your partner''s current favorite comfort food?'),
('daily_life', 'light', 'What is their ideal lazy Sunday?'),
('daily_life', 'light', 'What is one tiny thing that improves their mood?'),
('daily_life', 'light', 'What is their favorite way to be greeted?'),
('daily_life', 'light', 'What is their most repeated complaint lately?'),
('daily_life', 'light', 'What is their current show, podcast, or music obsession?'),
('daily_life', 'light', 'What is one chore they hate most?'),
('daily_life', 'light', 'What is one errand they keep putting off?'),
('daily_life', 'light', 'What is their perfect weather?'),
('daily_life', 'light', 'What is their favorite way to spend a free hour?');

-- Emotional Support (Medium) - 10 questions
INSERT INTO love_map_questions (category, depth, prompt) VALUES
('stress_support', 'medium', 'What is stressing your partner most this week?'),
('stress_support', 'medium', 'What kind of support do they want when overwhelmed?'),
('stress_support', 'medium', 'What kind of support annoys them?'),
('stress_support', 'medium', 'What is one sign they are secretly overloaded?'),
('stress_support', 'medium', 'What phrase helps calm them?'),
('stress_support', 'medium', 'What phrase makes them feel dismissed?'),
('stress_support', 'medium', 'What helps them recover after a hard day?'),
('stress_support', 'medium', 'What do they wish you noticed more often?'),
('stress_support', 'medium', 'What makes them feel emotionally safe?'),
('stress_support', 'medium', 'What makes them feel alone even when you are nearby?');

-- Affection and Romance (Medium) - 10 questions
INSERT INTO love_map_questions (category, depth, prompt) VALUES
('affection_romance', 'medium', 'What compliment means the most to them?'),
('affection_romance', 'medium', 'What kind of touch do they like most?'),
('affection_romance', 'medium', 'What kind of date would they enjoy this month?'),
('affection_romance', 'medium', 'What makes them feel desired?'),
('affection_romance', 'medium', 'What makes them feel chosen?'),
('affection_romance', 'medium', 'What romantic gesture would feel authentic, not cheesy?'),
('affection_romance', 'medium', 'What do they wish happened more spontaneously?'),
('affection_romance', 'medium', 'What is one thing you do that makes them smile?'),
('affection_romance', 'medium', 'What makes them feel secure in the relationship?'),
('affection_romance', 'medium', 'What is one way they prefer love to be shown?');

-- History (Medium) - 10 questions
INSERT INTO love_map_questions (category, depth, prompt) VALUES
('history', 'medium', 'What childhood experience shaped them?'),
('history', 'medium', 'Who is one person they deeply admire?'),
('history', 'medium', 'What was a major turning point in their life?'),
('history', 'medium', 'What is one memory they love from early in your relationship?'),
('history', 'medium', 'What is one hard thing they overcame?'),
('history', 'medium', 'What did they want to be when they were younger?'),
('history', 'medium', 'What family pattern do they not want to repeat?'),
('history', 'medium', 'What tradition matters to them?'),
('history', 'medium', 'What old version of themselves do they miss?'),
('history', 'medium', 'What past accomplishment are they proud of?');

-- Identity and Dreams (Medium) - 10 questions
INSERT INTO love_map_questions (category, depth, prompt) VALUES
('dreams_identity', 'medium', 'What is one dream they have not given up on?'),
('dreams_identity', 'medium', 'What kind of future excites them?'),
('dreams_identity', 'medium', 'What kind of future scares them?'),
('dreams_identity', 'medium', 'What value matters deeply to them?'),
('dreams_identity', 'medium', 'What do they want to be known for?'),
('dreams_identity', 'medium', 'What do they want more of in life?'),
('dreams_identity', 'medium', 'What do they want less of in life?'),
('dreams_identity', 'medium', 'What is something they wish they were braver about?'),
('dreams_identity', 'medium', 'What skill do they secretly want to develop?'),
('dreams_identity', 'medium', 'What would make them feel more alive?');

-- Conflict and Repair (Deep) - 10 questions
INSERT INTO love_map_questions (category, depth, prompt) VALUES
('conflict_repair', 'deep', 'What does your partner usually do when hurt?'),
('conflict_repair', 'deep', 'What do they need after an argument?'),
('conflict_repair', 'deep', 'What apology style works best for them?'),
('conflict_repair', 'deep', 'What makes them defensive?'),
('conflict_repair', 'deep', 'What makes them shut down?'),
('conflict_repair', 'deep', 'What makes them feel criticized?'),
('conflict_repair', 'deep', 'What helps them re-engage?'),
('conflict_repair', 'deep', 'What is one recurring issue they wish felt more like teamwork?'),
('conflict_repair', 'deep', 'What is one thing they wish you understood during conflict?'),
('conflict_repair', 'deep', 'What repair phrase would they actually appreciate?');

-- Deep Intimacy (Deep) - 10 questions
INSERT INTO love_map_questions (category, depth, prompt) VALUES
('conflict_repair', 'deep', 'What makes your partner feel not good enough?'),
('conflict_repair', 'deep', 'What do they fear you will misunderstand?'),
('conflict_repair', 'deep', 'What is hard for them to ask for?'),
('conflict_repair', 'deep', 'What do they need but minimize?'),
('conflict_repair', 'deep', 'What insecurity do they hide well?'),
('conflict_repair', 'deep', 'What kind of rejection hurts them most?'),
('conflict_repair', 'deep', 'What do they grieve?'),
('conflict_repair', 'deep', 'What makes them feel deeply seen?'),
('conflict_repair', 'deep', 'What part of themselves do they protect?'),
('conflict_repair', 'deep', 'What truth would they share if they felt completely safe?');

-- Funny and Weird (Light) - 10 questions
INSERT INTO love_map_questions (category, depth, prompt) VALUES
('play_humor', 'light', 'What is your partner''s most irrational pet peeve?'),
('play_humor', 'light', 'What tiny inconvenience ruins their day dramatically?'),
('play_humor', 'light', 'What animal matches their personality today?'),
('play_humor', 'light', 'What fictional character would they be?'),
('play_humor', 'light', 'What is their villain origin story this week?'),
('play_humor', 'light', 'What would they buy with a surprise $100?'),
('play_humor', 'light', 'What would they ban from society if given power?'),
('play_humor', 'light', 'What topic can they rant about for 10 minutes?'),
('play_humor', 'light', 'What food do they pretend not to like but actually enjoy?'),
('play_humor', 'light', 'What is their most predictable "I''m tired" behavior?');

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Sample questions for each category and depth
const sampleQuestions = [
  // Daily Life - Light
  { category: 'daily_life', depth: 'light', question_text: 'What is your favorite part of our daily routine together?' },
  { category: 'daily_life', depth: 'light', question_text: 'What small thing do I do that makes your day better?' },
  { category: 'daily_life', depth: 'light', question_text: 'What household chore do you actually enjoy doing?' },

  // Daily Life - Medium
  { category: 'daily_life', depth: 'medium', question_text: 'How do you prefer to spend your free time in the evenings?' },
  { category: 'daily_life', depth: 'medium', question_text: 'What aspect of our daily routine would you like to change?' },
  { category: 'daily_life', depth: 'medium', question_text: 'What morning ritual is most important to you?' },

  // Stress Support - Medium
  { category: 'stress_support', depth: 'medium', question_text: 'What helps you feel supported when you are stressed?' },
  { category: 'stress_support', depth: 'medium', question_text: 'What are your biggest sources of stress right now?' },
  { category: 'stress_support', depth: 'medium', question_text: 'How can I tell when you are feeling overwhelmed?' },

  // Stress Support - Deep
  { category: 'stress_support', depth: 'deep', question_text: 'What do you need from me when you are going through a difficult time?' },
  { category: 'stress_support', depth: 'deep', question_text: 'What past experience still affects how you handle stress today?' },
  { category: 'stress_support', depth: 'deep', question_text: 'When have I been there for you in the way you needed most?' },

  // Affection Romance - Light/Medium
  { category: 'affection_romance', depth: 'light', question_text: 'What is your favorite way to show affection?' },
  { category: 'affection_romance', depth: 'medium', question_text: 'What makes you feel most loved by me?' },
  { category: 'affection_romance', depth: 'medium', question_text: 'What romantic gesture would mean the most to you?' },

  // Affection Romance - Deep
  { category: 'affection_romance', depth: 'deep', question_text: 'What does intimacy mean to you in our relationship?' },
  { category: 'affection_romance', depth: 'deep', question_text: 'How has our physical connection evolved over time?' },
  { category: 'affection_romance', depth: 'deep', question_text: 'What do you need to feel emotionally connected to me?' },

  // History
  { category: 'history', depth: 'light', question_text: 'What is your favorite memory of us from the past year?' },
  { category: 'history', depth: 'medium', question_text: 'What moment made you realize you loved me?' },
  { category: 'history', depth: 'deep', question_text: 'How has our relationship changed you as a person?' },

  // Dreams Identity - Light/Medium
  { category: 'dreams_identity', depth: 'light', question_text: 'What is something you have always wanted to try?' },
  { category: 'dreams_identity', depth: 'medium', question_text: 'What are your biggest goals for the next five years?' },
  { category: 'dreams_identity', depth: 'medium', question_text: 'What part of yourself are you most proud of?' },

  // Dreams Identity - Deep
  { category: 'dreams_identity', depth: 'deep', question_text: 'How do you want to grow as a person in our relationship?' },
  { category: 'dreams_identity', depth: 'deep', question_text: 'What legacy do you want to leave in this world?' },
  { category: 'dreams_identity', depth: 'deep', question_text: 'What fear holds you back from pursuing your dreams?' },

  // Conflict Repair - Medium
  { category: 'conflict_repair', depth: 'medium', question_text: 'What usually triggers our arguments?' },
  { category: 'conflict_repair', depth: 'medium', question_text: 'How do you prefer to resolve disagreements?' },
  { category: 'conflict_repair', depth: 'medium', question_text: 'What do I do that frustrates you most during a conflict?' },

  // Conflict Repair - Deep
  { category: 'conflict_repair', depth: 'deep', question_text: 'What unresolved issue between us still bothers you?' },
  { category: 'conflict_repair', depth: 'deep', question_text: 'How can we repair our connection after a fight?' },
  { category: 'conflict_repair', depth: 'deep', question_text: 'What childhood experience affects how you handle conflict?' },

  // Play Humor - Light
  { category: 'play_humor', depth: 'light', question_text: 'What always makes you laugh when we are together?' },
  { category: 'play_humor', depth: 'light', question_text: 'What is the silliest thing we have ever done together?' },
  { category: 'play_humor', depth: 'light', question_text: 'What fun activity should we try together soon?' },
]

export async function POST() {
  try {
    const supabase = await createClient()

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if questions already exist
    const { data: existingQuestions } = await supabase
      .from('love_map_questions')
      .select('id')
      .limit(1)

    if (existingQuestions && existingQuestions.length > 0) {
      return NextResponse.json({
        message: 'Questions already seeded',
        count: existingQuestions.length
      })
    }

    // Insert sample questions
    const { data: inserted, error: insertError } = await supabase
      .from('love_map_questions')
      .insert(sampleQuestions)
      .select()

    if (insertError) {
      console.error('Error inserting questions:', insertError)
      return NextResponse.json({
        error: 'Failed to seed questions',
        details: insertError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      message: 'Successfully seeded questions',
      count: inserted?.length || 0,
      questions: inserted
    })
  } catch (error) {
    console.error('Seed questions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

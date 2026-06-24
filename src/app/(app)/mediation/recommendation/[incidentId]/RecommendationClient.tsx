'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { ConflictSafetyEvaluation, RecommendedAction } from '@/types/mediation';

interface Props {
  incidentId: string;
  initialEvaluation: ConflictSafetyEvaluation | null;
  relationshipId: string;
}

const actionLabels: Record<RecommendedAction, string> = {
  joint_mediation: 'Talk Together Now',
  take_break: 'Take a Break',
  solo_conversations: 'Continue Processing Alone',
  professional_help: 'Get Professional Help',
  crisis_resources: 'Access Crisis Resources'
};

const actionEmojis: Record<RecommendedAction, string> = {
  joint_mediation: '💬',
  take_break: '🕒',
  solo_conversations: '💭',
  professional_help: '🏥',
  crisis_resources: '🚨'
};

export default function RecommendationClient({
  incidentId,
  initialEvaluation,
  relationshipId
}: Props) {
  const router = useRouter();
  const [evaluation, setEvaluation] = useState<ConflictSafetyEvaluation | null>(initialEvaluation);
  const [loading, setLoading] = useState(!initialEvaluation);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (!evaluation) {
      // Poll for evaluation or trigger it
      fetchOrTriggerEvaluation();
    }

    // Subscribe to evaluation updates
    const channel = supabase
      .channel(`evaluation:${incidentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conflict_safety_evaluations',
          filter: `incident_id=eq.${incidentId}`
        },
        (payload) => {
          setEvaluation(payload.new as ConflictSafetyEvaluation);
          setLoading(false);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId]);

  const fetchOrTriggerEvaluation = async () => {
    try {
      // First try to get existing evaluation
      const getResponse = await fetch(`/api/mediation/incidents/${incidentId}/evaluate`);

      if (getResponse.ok) {
        const data = await getResponse.json();
        setEvaluation(data.evaluation);
        setLoading(false);
        return;
      }

      // If not found, trigger evaluation
      const postResponse = await fetch(`/api/mediation/incidents/${incidentId}/evaluate`, {
        method: 'POST'
      });

      if (!postResponse.ok) {
        throw new Error('Failed to generate evaluation');
      }

      const data = await postResponse.json();
      setEvaluation(data.evaluation);
      setLoading(false);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSelectOption = async (action: RecommendedAction) => {
    // Navigate based on selected action
    switch (action) {
      case 'joint_mediation':
        // Update incident status and redirect to chat
        router.push(`/chat?relationship=${relationshipId}`);
        break;
      case 'take_break':
        // Show break confirmation and return to dashboard
        router.push(`/dashboard?message=break_scheduled`);
        break;
      case 'solo_conversations':
        // Return to solo conversation
        // Find the user's solo conversation
        const { data: soloConv } = await supabase
          .from('solo_conversations')
          .select('id')
          .eq('incident_id', incidentId)
          .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
          .single();

        if (soloConv) {
          router.push(`/mediation/solo/${soloConv.id}`);
        }
        break;
      case 'professional_help':
      case 'crisis_resources':
        // Scroll to resources section
        document.getElementById('resources')?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Analyzing both perspectives...
          </h2>
          <p className="text-gray-600">
            I'm reviewing what you've both shared to determine the best next step
          </p>
        </div>
      </div>
    );
  }

  if (error || !evaluation) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            Unable to generate recommendation
          </h2>
          <p className="text-gray-600 mb-4">{error || 'Something went wrong'}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const isCrisis = evaluation.safety_level === 'crisis' || evaluation.primary_recommendation === 'crisis_resources';

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {isCrisis ? '🚨 Immediate Support Needed' : "Here's what I recommend"}
          </h1>
          <p className="text-gray-600">
            Based on what you've both shared, here's my personalized recommendation
          </p>
        </div>

        {/* Primary Recommendation Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-6xl">
              {actionEmojis[evaluation.primary_recommendation]}
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                My Recommendation: {actionLabels[evaluation.primary_recommendation]}
              </h2>
              {evaluation.safety_level !== 'safe' && (
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${
                  evaluation.safety_level === 'crisis' ? 'bg-red-100 text-red-800' :
                  evaluation.safety_level === 'high_concern' ? 'bg-orange-100 text-orange-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  Safety Level: {evaluation.safety_level.replace('_', ' ')}
                </div>
              )}
            </div>
          </div>

          {/* Reasoning */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-purple-900 mb-2">Why I'm recommending this:</h3>
            <p className="text-purple-800 whitespace-pre-wrap">{evaluation.evaluation_reasoning}</p>
          </div>

          {/* Personalization Factors */}
          <div className="space-y-3 mb-6">
            {evaluation.personalization_factors.safety_factors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">🛡️ Safety considerations:</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {evaluation.personalization_factors.safety_factors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.personalization_factors.personality_factors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">👥 Based on your personalities:</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {evaluation.personalization_factors.personality_factors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.personalization_factors.current_state_factors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">💭 Current emotional state:</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {evaluation.personalization_factors.current_state_factors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluation.personalization_factors.history_factors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-1">📊 Historical patterns:</h4>
                <ul className="text-sm text-gray-600 list-disc list-inside">
                  {evaluation.personalization_factors.history_factors.map((factor, i) => (
                    <li key={i}>{factor}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Primary Action Button */}
          <button
            onClick={() => handleSelectOption(evaluation.primary_recommendation)}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-xl font-semibold text-lg hover:from-pink-600 hover:to-purple-600 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            {actionEmojis[evaluation.primary_recommendation]}
            {actionLabels[evaluation.primary_recommendation]} ✨
          </button>
        </div>

        {/* Alternative Options */}
        {evaluation.alternative_options.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Or, if you prefer:
            </h3>
            <p className="text-gray-600 mb-4">
              You're in control - choose what feels right for you
            </p>
            <div className="space-y-3">
              {evaluation.alternative_options.map((action) => (
                <button
                  key={action}
                  onClick={() => handleSelectOption(action)}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-purple-500 hover:bg-purple-50 transition-all text-left flex items-center gap-3"
                >
                  <span className="text-3xl">{actionEmojis[action]}</span>
                  <span className="font-medium text-gray-900">{actionLabels[action]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Professional Help Resources */}
        {(evaluation.primary_recommendation === 'professional_help' || evaluation.primary_recommendation === 'crisis_resources') && evaluation.professional_help_resources && (
          <div id="resources" className="bg-white rounded-2xl shadow-xl p-8 mt-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              {isCrisis ? '🚨 Immediate Support Available' : '🏥 Professional Resources'}
            </h3>

            {/* Crisis Lines */}
            {evaluation.professional_help_resources.crisis_lines && (
              <div className="mb-6">
                <h4 className="font-semibold text-gray-700 mb-3">24/7 Crisis Hotlines:</h4>
                <div className="space-y-3">
                  {evaluation.professional_help_resources.crisis_lines.map((line: any, i: number) => (
                    <div key={i} className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h5 className="font-semibold text-red-900">{line.name}</h5>
                      {line.phone && (
                        <a href={`tel:${line.phone}`} className="text-blue-600 hover:underline block">
                          📞 {line.phone}
                        </a>
                      )}
                      {line.text && (
                        <p className="text-red-800 text-sm">{line.text}</p>
                      )}
                      <p className="text-red-700 text-xs mt-1">{line.hours}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Therapist Directories */}
            {evaluation.professional_help_resources.therapist_directories && (
              <div>
                <h4 className="font-semibold text-gray-700 mb-3">Find a Therapist:</h4>
                <div className="space-y-3">
                  {evaluation.professional_help_resources.therapist_directories.map((dir: any, i: number) => (
                    <div key={i} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-semibold text-blue-900">{dir.name}</h5>
                      <p className="text-blue-800 text-sm mb-2">{dir.description}</p>
                      <a
                        href={dir.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Visit {dir.name} →
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-sm text-gray-500">
            Remember: This recommendation is based on what you've both shared. You know your relationship best.
          </p>
        </div>
      </div>
    </div>
  );
}

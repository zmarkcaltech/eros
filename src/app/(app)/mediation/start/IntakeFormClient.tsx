'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type {
  SubmitIntakeRequest,
  EmotionalState,
  ConflictFrequency,
  PreferredNextStep
} from '@/types/mediation';

interface Props {
  incidentId: string;
  relationshipId: string;
  partnerIntake?: {
    what_happened: string;
    intensity_rating: number;
    current_emotional_state: string[];
    has_happened_before: boolean;
    if_yes_how_often?: string;
    what_you_need_right_now?: string;
    urgency_to_resolve: number;
    how_triggered: number;
  };
  partnerName: string;
}

export default function IntakeFormClient({ incidentId, relationshipId, partnerIntake, partnerName }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState<Partial<SubmitIntakeRequest>>({
    what_happened: '',
    intensity_rating: 5,
    has_happened_before: false,
    if_yes_how_often: undefined,
    current_emotional_state: [],
    physical_safety_concern: false,
    emotional_safety_concern: false,
    need_immediate_break: false,
    thoughts_of_ending_relationship: false,
    substance_involved: false,
    urgency_to_resolve: 5,
    how_triggered: 5,
    preferred_next_step: [],
    what_you_need_right_now: '',
    anything_else: ''
  });

  const totalSteps = 14;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/mediation/incidents/${incidentId}/intake`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to submit intake');
      }

      const data = await response.json();

      // Redirect to solo conversation
      router.push(`/mediation/solo/${data.solo_conversation_id}`);
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              {partnerIntake ? `What's your take on what happened?` : `Tell me what happened`}
            </h2>
            {partnerIntake ? (
              <>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
                  <p className="text-sm text-blue-900 mb-2">
                    <strong>Context from {partnerName}:</strong>
                  </p>
                  <p className="text-sm text-blue-800 italic">
                    "{partnerIntake.what_happened}"
                  </p>
                </div>
                <p className="text-gray-600">
                  {partnerName} shared their perspective above. Now I'd like to hear yours. What was your experience of this situation? Take your time - this is private, just between you and me.
                </p>
              </>
            ) : (
              <p className="text-gray-600">
                Take your time - this is private, just between you and me.
              </p>
            )}
            <textarea
              value={formData.what_happened}
              onChange={(e) => setFormData({ ...formData, what_happened: e.target.value })}
              className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              placeholder={partnerIntake ? "What was your experience of this situation?" : "Describe what happened from your perspective..."}
              required
            />
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              How intense was this conflict for you?
            </h2>
            {partnerIntake && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
                <p className="text-sm text-purple-900">
                  {partnerName} rated this as a <strong>{partnerIntake.intensity_rating}/10</strong> in intensity for them
                </p>
              </div>
            )}
            <p className="text-gray-600">
              On a scale of 1-10, how intense was it from your perspective?
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>1 - Minor annoyance</span>
                <span>10 - Explosive fight</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.intensity_rating}
                onChange={(e) => setFormData({ ...formData, intensity_rating: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500"
              />
              <div className="text-center">
                <span className="text-4xl font-bold text-pink-600">{formData.intensity_rating}</span>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              {partnerIntake ? `From your perspective, has this type of conflict happened before?` : `Has this happened before?`}
            </h2>
            {partnerIntake && partnerIntake.has_happened_before && partnerIntake.if_yes_how_often && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
                <p className="text-sm text-purple-900">
                  {partnerName} mentioned this type of issue has come up before ({partnerIntake.if_yes_how_often.replace(/_/g, ' ')})
                </p>
              </div>
            )}
            <div className="space-y-3">
              <button
                onClick={() => setFormData({ ...formData, has_happened_before: false, if_yes_how_often: undefined })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  !formData.has_happened_before
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    !formData.has_happened_before ? 'border-pink-500' : 'border-gray-300'
                  }`}>
                    {!formData.has_happened_before && (
                      <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                    )}
                  </div>
                  <span className="font-medium">No, this is the first time</span>
                </div>
              </button>
              <button
                onClick={() => setFormData({ ...formData, has_happened_before: true })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  formData.has_happened_before
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="flex items-center">
                  <div className={`w-5 h-5 rounded-full border-2 mr-3 flex items-center justify-center ${
                    formData.has_happened_before ? 'border-pink-500' : 'border-gray-300'
                  }`}>
                    {formData.has_happened_before && (
                      <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                    )}
                  </div>
                  <span className="font-medium">Yes, this has happened before</span>
                </div>
              </button>
            </div>
            {formData.has_happened_before && (
              <div className="mt-6 space-y-3">
                <p className="text-gray-700 font-medium">How often does this happen?</p>
                {['few_times_this_year', 'monthly', 'weekly', 'daily', 'constantly'].map((freq) => (
                  <button
                    key={freq}
                    onClick={() => setFormData({ ...formData, if_yes_how_often: freq as ConflictFrequency })}
                    className={`w-full p-3 text-left border-2 rounded-lg transition-colors ${
                      formData.if_yes_how_often === freq
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {freq.replace(/_/g, ' ').charAt(0).toUpperCase() + freq.replace(/_/g, ' ').slice(1)}
                  </button>
                ))}
              </div>
            )}
          </div>
        );

      case 4:
        const emotions: { value: EmotionalState; label: string; emoji: string }[] = [
          { value: 'angry', label: 'Angry', emoji: '😠' },
          { value: 'hurt', label: 'Hurt', emoji: '💔' },
          { value: 'sad', label: 'Sad', emoji: '😢' },
          { value: 'frustrated', label: 'Frustrated', emoji: '😤' },
          { value: 'confused', label: 'Confused', emoji: '😕' },
          { value: 'scared', label: 'Scared', emoji: '😨' },
          { value: 'disappointed', label: 'Disappointed', emoji: '😞' },
          { value: 'betrayed', label: 'Betrayed', emoji: '😔' },
          { value: 'anxious', label: 'Anxious', emoji: '😰' },
          { value: 'overwhelmed', label: 'Overwhelmed', emoji: '😫' },
          { value: 'numb', label: 'Numb', emoji: '😶' }
        ];

        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              How are you feeling right now?
            </h2>
            {partnerIntake && partnerIntake.current_emotional_state && partnerIntake.current_emotional_state.length > 0 && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
                <p className="text-sm text-purple-900 mb-1">
                  {partnerName} is feeling: <strong>{partnerIntake.current_emotional_state.join(', ')}</strong>
                </p>
                <p className="text-xs text-purple-700">
                  Understanding each other's emotions helps you both reconnect
                </p>
              </div>
            )}
            <p className="text-gray-600">Select all that apply</p>
            <div className="grid grid-cols-2 gap-3">
              {emotions.map((emotion) => {
                const isSelected = formData.current_emotional_state?.includes(emotion.value);
                return (
                  <button
                    key={emotion.value}
                    onClick={() => {
                      const current = formData.current_emotional_state || [];
                      const updated = isSelected
                        ? current.filter(e => e !== emotion.value)
                        : [...current, emotion.value];
                      setFormData({ ...formData, current_emotional_state: updated });
                    }}
                    className={`p-4 border-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">{emotion.emoji}</div>
                    <div className="font-medium">{emotion.label}</div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Safety check: Physical
            </h2>
            <p className="text-gray-600">Do you feel physically safe right now?</p>
            <div className="space-y-3">
              <button
                onClick={() => setFormData({ ...formData, physical_safety_concern: false })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  !formData.physical_safety_concern
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                ✅ Yes, I feel physically safe
              </button>
              <button
                onClick={() => setFormData({ ...formData, physical_safety_concern: true })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  formData.physical_safety_concern
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                ⚠️ No, I have concerns about my physical safety
              </button>
            </div>
            {formData.physical_safety_concern && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="font-semibold text-red-900 mb-2">⚠️ Your safety is the top priority</p>
                <p className="text-red-800 text-sm mb-3">
                  If you're in immediate danger, please call 911 or reach out to:
                </p>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>National Domestic Violence Hotline:</strong><br/>
                    <a href="tel:18007997233" className="text-blue-600 underline">1-800-799-7233</a> or text START to 88788
                  </div>
                  <div>
                    <strong>Crisis Text Line:</strong><br/>
                    Text HELLO to <a href="sms:741741" className="text-blue-600 underline">741741</a>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 6:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Safety check: Emotional
            </h2>
            <p className="text-gray-600">Do you feel emotionally safe to talk about this?</p>
            <div className="space-y-3">
              <button
                onClick={() => setFormData({ ...formData, emotional_safety_concern: false })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  !formData.emotional_safety_concern
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                ✅ Yes, I feel emotionally safe
              </button>
              <button
                onClick={() => setFormData({ ...formData, emotional_safety_concern: true })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  formData.emotional_safety_concern
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                ⚠️ No, I don't feel emotionally safe
              </button>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Do you need a break right now?
            </h2>
            <div className="space-y-3">
              <button
                onClick={() => setFormData({ ...formData, need_immediate_break: false })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  !formData.need_immediate_break
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                No, I'm ready to continue
              </button>
              <button
                onClick={() => setFormData({ ...formData, need_immediate_break: true })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  formData.need_immediate_break
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Yes, I need some time
              </button>
            </div>
          </div>
        );

      case 8:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Relationship thoughts
            </h2>
            <p className="text-gray-600">Are you having thoughts about ending the relationship?</p>
            <div className="space-y-3">
              <button
                onClick={() => setFormData({ ...formData, thoughts_of_ending_relationship: false })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  !formData.thoughts_of_ending_relationship
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                No
              </button>
              <button
                onClick={() => setFormData({ ...formData, thoughts_of_ending_relationship: true })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  formData.thoughts_of_ending_relationship
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Yes, I'm having these thoughts
              </button>
            </div>
          </div>
        );

      case 9:
        return (
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold text-gray-900">
              Substance involvement
            </h2>
            <p className="text-gray-600">Was alcohol or substance use involved in this conflict?</p>
            <div className="space-y-3">
              <button
                onClick={() => setFormData({ ...formData, substance_involved: false })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  !formData.substance_involved
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                No
              </button>
              <button
                onClick={() => setFormData({ ...formData, substance_involved: true })}
                className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                  formData.substance_involved
                    ? 'border-yellow-500 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Yes
              </button>
            </div>
          </div>
        );

      case 10:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              How urgently do you need to resolve this?
            </h2>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>1 - Can wait</span>
                <span>10 - Need to talk now</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.urgency_to_resolve}
                onChange={(e) => setFormData({ ...formData, urgency_to_resolve: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
              <div className="text-center">
                <span className="text-4xl font-bold text-purple-600">{formData.urgency_to_resolve}</span>
              </div>
            </div>
          </div>
        );

      case 11:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              How triggered are you right now?
            </h2>
            <p className="text-gray-600">How activated or upset do you feel?</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-500">
                <span>1 - Calm, grounded</span>
                <span>10 - Extremely upset</span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={formData.how_triggered}
                onChange={(e) => setFormData({ ...formData, how_triggered: parseInt(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
              />
              <div className="text-center">
                <span className="text-4xl font-bold text-red-600">{formData.how_triggered}</span>
              </div>
            </div>
          </div>
        );

      case 12:
        const preferences: { value: PreferredNextStep; label: string }[] = [
          { value: 'talk_now', label: 'I want to talk about this together now' },
          { value: 'take_break', label: 'I need to take a break first' },
          { value: 'process_alone_first', label: 'I want to process this alone before talking' },
          { value: 'not_sure', label: "I'm not sure what I need" }
        ];

        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              What feels right for you next?
            </h2>
            <p className="text-gray-600">
              Select all that apply - this won't lock you in, just helps me understand what feels right to you
            </p>
            <div className="space-y-3">
              {preferences.map((pref) => {
                const isSelected = formData.preferred_next_step?.includes(pref.value);
                return (
                  <button
                    key={pref.value}
                    onClick={() => {
                      const current = formData.preferred_next_step || [];
                      const updated = isSelected
                        ? current.filter(p => p !== pref.value)
                        : [...current, pref.value];
                      setFormData({ ...formData, preferred_next_step: updated });
                    }}
                    className={`w-full p-4 text-left border-2 rounded-lg transition-colors ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center">
                      <div className={`w-5 h-5 rounded border-2 mr-3 flex items-center justify-center ${
                        isSelected ? 'border-purple-500 bg-purple-500' : 'border-gray-300'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span>{pref.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 13:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              What do you need right now?
            </h2>
            {partnerIntake && partnerIntake.what_you_need_right_now && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-2">
                <p className="text-sm text-purple-900 mb-1">
                  {partnerName} shared they need: "{partnerIntake.what_you_need_right_now}"
                </p>
                <p className="text-xs text-purple-700">
                  Knowing each other's needs helps you both move toward resolution
                </p>
              </div>
            )}
            <p className="text-gray-600">
              For example: "I need them to listen", "I need space", "I need to feel heard"
            </p>
            <textarea
              value={formData.what_you_need_right_now}
              onChange={(e) => setFormData({ ...formData, what_you_need_right_now: e.target.value })}
              className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="What do you need from your partner or this situation?"
            />
          </div>
        );

      case 14:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-gray-900">
              Anything else?
            </h2>
            <p className="text-gray-600">
              Is there anything else I should know? (Optional)
            </p>
            <textarea
              value={formData.anything_else}
              onChange={(e) => setFormData({ ...formData, anything_else: e.target.value })}
              className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              placeholder="Any additional context or information..."
            />
            <p className="text-sm text-gray-500">
              Almost done! After you submit, you'll have a private conversation with me to process your emotions before we bring your partner into the conversation.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {step} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-gray-600">
              {Math.round((step / totalSteps) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {renderStep()}

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
              {error}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-200">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
                disabled={loading}
              >
                ← Back
              </button>
            ) : (
              <div></div>
            )}

            {step < totalSteps ? (
              <button
                onClick={handleNext}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg"
                disabled={loading}
              >
                Continue →
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={loading || !formData.what_happened || formData.current_emotional_state?.length === 0}
                className="px-8 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Complete Intake →'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

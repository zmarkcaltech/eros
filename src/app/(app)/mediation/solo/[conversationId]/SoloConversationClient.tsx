'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { SoloConversationMessage } from '@/types/mediation';

// Component to render message with copy buttons for drafts
function MessageContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Check if message contains message drafts (📱 pattern)
  const hasMessageDrafts = content.includes('📱');

  const handleCopy = (text: string, index: number) => {
    // Remove the emoji and label, keep just the message text
    const cleanText = text
      .replace(/📱\s*Option\s*\d+[:\s]*(\([^)]+\))?:?\s*/i, '')
      .replace(/^["']|["']$/g, '')
      .trim();

    navigator.clipboard.writeText(cleanText);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!hasMessageDrafts) {
    return <p className="whitespace-pre-wrap">{content}</p>;
  }

  // Split content by message draft markers
  const parts = content.split(/(📱[^\n]+\n[^\n📱]+)/g);

  return (
    <div className="space-y-3">
      {parts.map((part, index) => {
        if (part.trim().startsWith('📱')) {
          // This is a message draft - add copy button
          const lines = part.trim().split('\n');
          const header = lines[0];
          const message = lines.slice(1).join('\n').trim();

          return (
            <div key={index} className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg p-3 relative group">
              <div className="text-xs font-semibold text-purple-900 mb-2">{header}</div>
              <div className="text-sm text-gray-800 mb-2 font-medium">{message}</div>
              <button
                onClick={() => handleCopy(message, index)}
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity bg-purple-600 text-white text-xs px-3 py-1 rounded-full hover:bg-purple-700 flex items-center gap-1"
              >
                {copiedIndex === index ? (
                  <>✓ Copied!</>
                ) : (
                  <>📋 Copy</>
                )}
              </button>
            </div>
          );
        }
        return part.trim() ? <p key={index} className="whitespace-pre-wrap">{part}</p> : null;
      })}
    </div>
  );
}

interface Props {
  conversationId: string;
  incidentId: string | null;
  initialMessages: SoloConversationMessage[];
  userName: string;
  intakeData: any;
  incident: any;
  userId: string;
}

export default function SoloConversationClient({
  conversationId,
  incidentId,
  initialMessages,
  userName,
  intakeData,
  incident: initialIncident,
  userId
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<SoloConversationMessage[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [incident, setIncident] = useState(initialIncident);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  // Determine conflict status for display
  const getStatusInfo = () => {
    if (!incident) return { text: 'Loading...', color: 'gray' };

    const relationship = incident.relationships;
    const userIsPartnerA = relationship.partner_a_id === userId;
    const partnerIntakeCompleted = userIsPartnerA
      ? incident.partner_b_intake_completed_at
      : incident.partner_a_intake_completed_at;

    if (!partnerIntakeCompleted) {
      return {
        text: 'Awaiting partner response',
        color: 'yellow',
        nextStep: null
      };
    }

    if (incident.status === 'safety_evaluation') {
      return {
        text: 'Both intakes complete - Eros is evaluating',
        color: 'blue',
        nextStep: { url: `/mediation/recommendation/${incidentId}`, label: 'View Recommendation' }
      };
    }

    if (incident.status === 'solo_conversations') {
      return {
        text: 'Both partners preparing messages',
        color: 'purple',
        nextStep: { url: `/mediation/recommendation/${incidentId}`, label: 'View Recommendation' }
      };
    }

    if (incident.status === 'joint_mediation_ready') {
      return {
        text: 'Ready for joint conversation',
        color: 'green',
        nextStep: { url: `/mediation/conversation/${incidentId}`, label: 'Start Joint Conversation' }
      };
    }

    return {
      text: incident.status.replace(/_/g, ' '),
      color: 'gray',
      nextStep: null
    };
  };

  const statusInfo = getStatusInfo();

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`solo_messages:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'solo_conversation_messages',
          filter: `conversation_id=eq.${conversationId}`
        },
        (payload) => {
          const newMessage = payload.new as SoloConversationMessage;
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.find(m => m.id === newMessage.id)) {
              return prev;
            }
            return [...prev, newMessage];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  // Subscribe to conflict incident changes
  useEffect(() => {
    if (!incidentId) return;

    const channel = supabase
      .channel(`conflict_incident:${incidentId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conflict_incidents',
          filter: `id=eq.${incidentId}`
        },
        async (payload) => {
          // Re-fetch with relationships
          const { data: updatedIncident } = await supabase
            .from('conflict_incidents')
            .select('*, relationships!inner(*)')
            .eq('id', incidentId)
            .single();

          if (updatedIncident) {
            setIncident(updatedIncident);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [incidentId]);

  // Show emotional check-in after 5 messages
  useEffect(() => {
    if (messages.length >= 10 && !showCheckIn) {
      setShowCheckIn(true);
    }
  }, [messages.length]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      const response = await fetch(`/api/mediation/solo/${conversationId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: userInput })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();

      // Messages will be added via realtime subscription
      // But add them immediately for better UX
      setMessages(prev => [...prev, data.user_message, data.ai_response]);
    } catch (error) {
      console.error('Error sending message:', error);
      // Re-add input on error
      setInput(userInput);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReadyForNextStep = () => {
    // Navigate to evaluation/recommendation screen
    if (incidentId) {
      router.push(`/mediation/recommendation/${incidentId}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                title="Back to Dashboard"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-semibold text-gray-900">
                    Private Conversation with Eros
                  </h1>
                  {incident?.conflict_name && (
                    <span className="text-sm text-gray-500">• {incident.conflict_name}</span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <p className="text-sm text-gray-600">
                    This is private - your partner cannot see this conversation
                  </p>
                  {statusInfo && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      statusInfo.color === 'yellow' ? 'bg-yellow-100 text-yellow-800' :
                      statusInfo.color === 'blue' ? 'bg-blue-100 text-blue-800' :
                      statusInfo.color === 'purple' ? 'bg-purple-100 text-purple-800' :
                      statusInfo.color === 'green' ? 'bg-green-100 text-green-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {statusInfo.text}
                    </span>
                  )}
                </div>
              </div>
            </div>
            {statusInfo?.nextStep && (
              <button
                onClick={() => router.push(statusInfo.nextStep!.url)}
                className="px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg text-sm"
              >
                {statusInfo.nextStep.label} →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content: Conversation + Intake Sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Messages Section (Left) */}
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.sender_type === 'user'
                    ? 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                    : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                }`}
              >
                {message.sender_type === 'ai' && (
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                      E
                    </div>
                    <span className="text-xs font-medium text-gray-600">Eros</span>
                  </div>
                )}
                {message.sender_type === 'ai' ? (
                  <MessageContent content={message.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
                <div className={`text-xs mt-2 ${
                  message.sender_type === 'user' ? 'text-pink-100' : 'text-gray-500'
                }`}>
                  {new Date(message.created_at).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white border border-gray-200 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-6 h-6 rounded-full bg-gradient-to-r from-pink-400 to-purple-400 flex items-center justify-center text-white text-xs font-bold">
                    E
                  </div>
                  <span className="text-xs font-medium text-gray-600">Eros</span>
                </div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
          </div>

          {/* Emotional Check-in (after 5 exchanges) */}
          {showCheckIn && (
            <div className="max-w-4xl mx-auto px-4 pb-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm font-medium text-purple-900 mb-2">
                  💭 Quick check-in: How are you feeling now compared to when we started?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCheckIn(false)}
                    className="text-xs px-3 py-1 bg-green-100 text-green-700 rounded-full hover:bg-green-200 transition-colors"
                  >
                    Better - more grounded
                  </button>
                  <button
                    onClick={() => setShowCheckIn(false)}
                    className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full hover:bg-yellow-200 transition-colors"
                  >
                    About the same
                  </button>
                  <button
                    onClick={() => setShowCheckIn(false)}
                    className="text-xs px-3 py-1 bg-red-100 text-red-700 rounded-full hover:bg-red-200 transition-colors"
                  >
                    Still very upset
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Intake Summary Sidebar (Right) */}
        {intakeData && (
          <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  📋 Your Intake Summary
                </h2>
                <p className="text-xs text-gray-600 mb-4">
                  Reference this as you prepare for your conversation with your partner.
                </p>
              </div>

              {/* Emotional State */}
              {intakeData.current_emotional_state && intakeData.current_emotional_state.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Your Emotions</h3>
                  <div className="flex flex-wrap gap-2">
                    {intakeData.current_emotional_state.map((emotion: string) => (
                      <span
                        key={emotion}
                        className="inline-block px-3 py-1 bg-purple-100 text-purple-700 text-xs rounded-full"
                      >
                        {emotion}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Intensity & Metrics */}
              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-1">Intensity</h3>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-pink-500 to-purple-500 h-2 rounded-full"
                        style={{ width: `${(intakeData.intensity_rating / 10) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {intakeData.intensity_rating}/10
                    </span>
                  </div>
                </div>

                {intakeData.how_triggered && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">How Triggered</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full"
                          style={{ width: `${(intakeData.how_triggered / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {intakeData.how_triggered}/10
                      </span>
                    </div>
                  </div>
                )}

                {intakeData.urgency_to_resolve && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-700 mb-1">Urgency to Resolve</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full"
                          style={{ width: `${(intakeData.urgency_to_resolve / 10) * 100}%` }}
                        />
                      </div>
                      <span className="text-sm font-semibold text-gray-900">
                        {intakeData.urgency_to_resolve}/10
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* What You Need */}
              {intakeData.what_you_need_right_now && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">What You Need</h3>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-gray-800">{intakeData.what_you_need_right_now}</p>
                  </div>
                </div>
              )}

              {/* What Happened */}
              {intakeData.what_happened && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">What Happened</h3>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                    <p className="text-sm text-gray-800">{intakeData.what_happened}</p>
                  </div>
                </div>
              )}

              {/* Frequency */}
              {intakeData.if_yes_how_often && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Conflict Frequency</h3>
                  <p className="text-sm text-gray-600 capitalize">
                    {intakeData.if_yes_how_often.replace(/_/g, ' ')}
                  </p>
                </div>
              )}

              {/* Safety Concerns */}
              {(intakeData.physical_safety_concern || intakeData.emotional_safety_concern) && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">Safety Concerns</h3>
                  <div className="space-y-1 text-sm">
                    {intakeData.physical_safety_concern && (
                      <p className="text-red-600">⚠️ Physical safety concern noted</p>
                    )}
                    {intakeData.emotional_safety_concern && (
                      <p className="text-orange-600">⚠️ Emotional safety concern noted</p>
                    )}
                  </div>
                </div>
              )}

              {/* Preferred Next Step */}
              {intakeData.preferred_next_step && intakeData.preferred_next_step.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-700">You Preferred</h3>
                  <div className="flex flex-wrap gap-2">
                    {intakeData.preferred_next_step.map((step: string) => (
                      <span
                        key={step}
                        className="inline-block px-3 py-1 bg-green-100 text-green-700 text-xs rounded-full"
                      >
                        {step.replace(/_/g, ' ')}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex gap-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message... (Press Enter to send, Shift+Enter for new line)"
              className="flex-1 resize-none border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              rows={2}
              disabled={loading}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg font-medium hover:from-pink-600 hover:to-purple-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed h-fit"
            >
              Send
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Private conversation - your partner cannot see this
          </p>
        </div>
      </div>
    </div>
  );
}

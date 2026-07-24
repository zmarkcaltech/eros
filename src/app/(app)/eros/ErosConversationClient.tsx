'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Message {
  id: string;
  sender_type: 'user' | 'ai';
  content: string;
  created_at: string;
}

interface Conversation {
  id: string;
  status: string;
}

// Component to render message with copy buttons for drafts
function MessageContent({ content }: { content: string }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const hasMessageDrafts = content.includes('📱');

  const handleCopy = (text: string, index: number) => {
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
                {copiedIndex === index ? <>✓ Copied!</> : <>📋 Copy</>}
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
  initialConversation: Conversation;
  initialMessages: Message[];
}

export default function ErosConversationClient({
  initialConversation,
  initialMessages
}: Props) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Subscribe to real-time updates
  useEffect(() => {
    const channel = supabase
      .channel(`eros_messages:${initialConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'eros_conversation_messages',
          filter: `conversation_id=eq.${initialConversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as Message;
          setMessages((prev) => {
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
  }, [initialConversation.id]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userInput = input.trim();
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/eros/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation_id: initialConversation.id,
          content: userInput
        })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const data = await response.json();
      setMessages(prev => [...prev, data.user_message, data.ai_message]);
    } catch (error) {
      console.error('Error sending message:', error);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-blue-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4">
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
                <h1 className="text-xl font-semibold text-gray-900">
                  Talk to Eros
                </h1>
                <p className="text-sm text-gray-600">
                  Your private AI relationship counselor
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
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
            Private conversation - only you and Eros can see this
          </p>
        </div>
      </div>
    </div>
  );
}

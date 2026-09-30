'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils/cn';
import { Send } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}



export default function AssistantPage() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || isLoading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: trimmed,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, language }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || t.assistant.error);
      }

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: data.data.reply,
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Store deferral for the last message if present
      if (data.data.deferral) {
        setMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last && last.role === 'assistant') {
            // Deferral is rendered separately below
          }
          return updated;
        });
      }
    } catch {
      setError(t.assistant.error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto">
      {/* Header */}
      <header className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">{t.assistant.title}</h1>
        <p className="text-sm text-gray-600">{t.assistant.subtitle}</p>
      </header>

      {/* Disclaimer */}
      <div className="mb-4">
        <Alert variant="info" title={t.assistant.disclaimer} />
      </div>

      {/* Messages area */}
      <Card className="flex-1 overflow-y-auto p-4 space-y-4 mb-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <div className="w-16 h-16 rounded-full bg-seal-red/10 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-seal-red" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {t.assistant.emptyTitle}
            </h2>
            <p className="text-sm text-gray-600 max-w-sm">
              {t.assistant.emptyMessage}
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={cn(
                  'flex',
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                )}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-lg px-4 py-3 text-sm leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-seal-red text-white'
                      : 'bg-gray-100 text-gray-900'
                  )}
                >
                  {msg.role === 'user' ? (
                    msg.text
                  ) : (
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        p: ({ children }) => (
                          <p className="mb-2 last:mb-0">{children}</p>
                        ),
                        h1: ({ children }) => (
                          <h1 className="text-lg font-bold mt-3 mb-1">{children}</h1>
                        ),
                        h2: ({ children }) => (
                          <h2 className="text-base font-bold mt-3 mb-1">{children}</h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-sm font-bold mt-2 mb-1">{children}</h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-sm">{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold">{children}</strong>
                        ),
                        code: ({ children }) => (
                          <code className="bg-gray-200 rounded px-1 py-0.5 text-xs font-mono">
                            {children}
                          </code>
                        ),
                        a: ({ children, href }) => (
                          <a
                            href={href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-seal-red underline hover:text-ink break-words"
                          >
                            {children}
                          </a>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-seal-red/30 pl-3 italic text-gray-600 my-2">
                            {children}
                          </blockquote>
                        ),
                        table: ({ children }) => (
                          <div className="overflow-x-auto mb-2">
                            <table className="min-w-full text-xs border-collapse">
                              {children}
                            </table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="border border-gray-300 px-2 py-1 bg-gray-200 font-semibold text-left">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="border border-gray-300 px-2 py-1">{children}</td>
                        ),
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-lg px-4 py-3 flex items-center gap-2">
                  <Spinner className="w-4 h-4" />
                  <span className="text-sm text-gray-600">{t.assistant.loading}</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </Card>

      {/* Error */}
      {error && (
        <div className="mb-4">
          <Alert variant="danger" title={error} />
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t.assistant.inputPlaceholder}
          disabled={isLoading}
          className="flex-1 min-h-[48px] rounded-lg border-2 border-gray-300 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-seal-red focus:outline-none focus:ring-2 focus:ring-seal-red disabled:opacity-50"
          aria-label={t.assistant.inputPlaceholder}
        />
        <Button
          onClick={handleSend}
          disabled={isLoading || !input.trim()}
          isLoading={isLoading}
          aria-label={t.assistant.send}
          className="min-w-[48px]"
        >
          <Send className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}

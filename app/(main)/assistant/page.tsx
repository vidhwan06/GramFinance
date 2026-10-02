'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/utils/cn';
import { assistantCopy } from '@/features/assistant/presentation/dictionary';
import { HELPLINE_CYBERCRIME } from '@/lib/utils/constants';
import {
  ArrowUp,
  Check,
  Landmark,
  Lock,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Deferral {
  type: 'eligibility' | 'fraud' | 'loan';
  href: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  deferral?: Deferral;
}

export default function AssistantPage() {
  const { t, language } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Feature-local copy, selected by language (never via `t.*`).
  const c = assistantCopy[language === 'kn' ? 'kn' : 'en'];

  // Feature-local dictionary keys, guarded so the assistant works even when a
  // translation only carries the core assistant keys.
  const suggestions: string[] = t.assistant.suggestions ?? [];
  const suggestionsLabel: string | undefined = t.assistant.suggestionsLabel;
  const showSuggestions = Boolean(suggestionsLabel) && suggestions.length > 0;

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
        deferral: data.data.deferral ?? undefined,
      };

      setMessages((prev) => [...prev, assistantMessage]);
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

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    inputRef.current?.focus();
  };

  const handleClear = () => {
    setInput('');
    inputRef.current?.focus();
  };

  return (
    <div className="w-full">
      {/* ─────────────── PAGE HERO — Ask GramFinance identity ─────────────── */}
      <section className="w-full border-b border-outline-variant/40 bg-surface pb-6 pt-8">
        <div className="mx-auto max-w-[1440px] px-margin-mobile lg:px-margin">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="max-w-3xl">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded bg-secondary-container/40 px-2.5 py-1 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                  <Landmark className="h-4 w-4" aria-hidden="true" />
                  {c.eyebrow}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-container px-2.5 py-1 font-label-sm text-label-sm font-semibold text-inverse-on-surface">
                  <Sparkles className="h-3.5 w-3.5 text-tertiary-fixed" aria-hidden="true" />
                  {t.assistant.title}
                </span>
              </div>
              <h1 className="font-headline-lg text-headline-lg tracking-tight text-on-surface">
                {t.assistant.emptyTitle}
              </h1>
              <p className="mt-2 font-body-md text-body-md leading-relaxed text-on-surface-variant">
                {c.tagline}
                <span className="block font-medium text-on-surface sm:ml-1 sm:inline">
                  {t.assistant.subtitle}
                </span>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── WORKSPACE — intro rail + conversation + composer ─── */}
      <section className="w-full bg-surface-container-low py-8">
        <div className="mx-auto max-w-[1440px] px-margin-mobile lg:px-margin">
          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
            {/* LEFT RAIL — disclaimer doctrine + suggestion prompts */}
            <aside className="flex flex-col gap-6 lg:col-span-4">
              {/* Institutional AI doctrine callout (carries the disclaimer) */}
              <div className="relative overflow-hidden rounded-2xl bg-primary-container p-5 shadow-md">
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
                    <ShieldCheck className="h-5 w-5 text-tertiary-fixed" aria-hidden="true" />
                  </span>
                  <span className="font-title-md text-title-md text-inverse-on-surface">
                    {c.doctrineTitle}
                  </span>
                </div>
                <p className="mt-3 font-body-sm text-body-sm leading-relaxed text-inverse-on-surface">
                  {t.assistant.disclaimer}
                </p>
                <p className="mt-2 font-body-sm text-body-sm leading-relaxed text-on-primary-container">
                  {c.doctrineBody}
                </p>
                <div className="mt-3 space-y-2">
                  {c.doctrinePoints.map((point) => (
                    <div
                      key={point}
                      className="flex items-start gap-2 font-body-sm text-body-sm text-inverse-on-surface"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-tertiary-fixed" aria-hidden="true" />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Suggested prompts — only when the dictionary carries them */}
              {showSuggestions && (
                <div className="rounded-2xl bg-surface-container-lowest p-5 shadow-sm">
                  <span className="mb-3 block font-label-lg text-label-lg uppercase tracking-wider text-on-surface">
                    {suggestionsLabel}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => handleSuggestion(suggestion)}
                        disabled={isLoading}
                        className="min-h-[40px] rounded-lg bg-surface-container px-3 py-2 text-left font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-high focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:opacity-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </aside>

            {/* RIGHT CANVAS — conversation stream + composer */}
            <div className="flex flex-col gap-6 lg:col-span-8">
              {/* Structured conversation stream */}
              <div
                aria-live="polite"
                className="max-h-[55vh] min-h-[16rem] space-y-6 overflow-y-auto pr-1"
              >
                {messages.length === 0 ? (
                  <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-2xl bg-surface-container-lowest px-6 py-10 text-center shadow-sm">
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-container">
                      <MessageSquareText className="h-8 w-8 text-tertiary-fixed" aria-hidden="true" />
                    </div>
                    <p className="max-w-md font-body-md text-body-md leading-relaxed text-on-surface-variant">
                      {t.assistant.emptyMessage}
                    </p>
                    <p className="mt-3 font-label-sm text-label-sm text-outline">{c.emptyHint}</p>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn('flex', msg.role === 'user' ? 'justify-end' : 'justify-start')}
                    >
                      {msg.role === 'user' ? (
                        /* Aubergine user inquiry bubble */
                        <div className="flex max-w-full flex-col items-end">
                          <span className="mb-1.5 font-label-sm text-label-sm text-on-surface-variant">
                            {c.youLabel}
                          </span>
                          <div className="max-w-2xl rounded-2xl rounded-tr-sm bg-primary-container px-5 py-4 shadow-sm text-inverse-on-surface">
                            <p className="whitespace-pre-wrap font-body-md text-body-md leading-relaxed">
                              {msg.text}
                            </p>
                          </div>
                        </div>
                      ) : (
                        /* Light assistant response card */
                        <div className="w-full rounded-2xl bg-surface-container-lowest p-5 shadow-sm lg:p-6">
                          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/50 pb-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-container">
                                <Landmark className="h-5 w-5 text-tertiary-fixed" aria-hidden="true" />
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-title-md text-title-md text-on-surface">
                                  {c.assistantName}
                                </span>
                                <span className="rounded-full bg-secondary-container/40 px-2 py-0.5 font-label-sm text-label-sm font-semibold text-on-secondary-container">
                                  {c.assistantBadge}
                                </span>
                              </div>
                            </div>
                            <span className="inline-flex items-center gap-2 rounded-full bg-surface-container px-3 py-1.5 font-label-sm text-label-sm text-on-surface">
                              <span className="h-2 w-2 rounded-full bg-secondary" aria-hidden="true" />
                              <span className="font-semibold">{c.advisoryPill}</span>
                            </span>
                          </div>

                          <div className="pt-4 text-on-surface">
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => (
                                  <p className="mb-2 last:mb-0 text-body-md text-on-surface">{children}</p>
                                ),
                                h1: ({ children }) => (
                                  <h1 className="mb-2 mt-4 font-title-lg text-title-lg text-on-surface">
                                    {children}
                                  </h1>
                                ),
                                h2: ({ children }) => (
                                  <h2 className="mb-2 mt-4 font-title-md text-title-md text-on-surface">
                                    {children}
                                  </h2>
                                ),
                                h3: ({ children }) => (
                                  <h3 className="mb-1 mt-3 font-title-md text-title-md text-on-surface">
                                    {children}
                                  </h3>
                                ),
                                ul: ({ children }) => (
                                  <ul className="mb-2 list-disc space-y-1 pl-5 text-on-surface">
                                    {children}
                                  </ul>
                                ),
                                ol: ({ children }) => (
                                  <ol className="mb-2 list-decimal space-y-1 pl-5 text-on-surface">
                                    {children}
                                  </ol>
                                ),
                                li: ({ children }) => <li className="text-body-sm">{children}</li>,
                                strong: ({ children }) => (
                                  <strong className="font-semibold text-on-surface">{children}</strong>
                                ),
                                code: ({ children }) => (
                                  <code className="rounded bg-surface-container px-1.5 py-0.5 font-mono text-body-sm text-on-surface">
                                    {children}
                                  </code>
                                ),
                                a: ({ children, href }) => (
                                  <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="break-words text-secondary underline hover:text-on-surface"
                                  >
                                    {children}
                                  </a>
                                ),
                                blockquote: ({ children }) => (
                                  <blockquote className="my-2 border-l-4 border-secondary/40 pl-3 italic text-on-surface-variant">
                                    {children}
                                  </blockquote>
                                ),
                                table: ({ children }) => (
                                  <div className="mb-2 overflow-x-auto">
                                    <table className="min-w-full border-collapse text-body-sm">
                                      {children}
                                    </table>
                                  </div>
                                ),
                                th: ({ children }) => (
                                  <th className="border border-outline-variant bg-surface-container px-2 py-1 text-left font-semibold">
                                    {children}
                                  </th>
                                ),
                                td: ({ children }) => (
                                  <td className="border border-outline-variant px-2 py-1">
                                    {children}
                                  </td>
                                ),
                              }}
                            >
                              {msg.text}
                            </ReactMarkdown>
                          </div>

                          {/* Contextual action returned by the assistant backend */}
                          {msg.deferral && (
                            <div className="mt-4 border-t border-outline-variant/50 pt-4">
                              <span className="mb-2 block font-label-sm text-label-sm font-semibold uppercase tracking-wider text-on-surface-variant">
                                {c.deferralLabel}
                              </span>
                              <Link
                                href={msg.deferral.href}
                                className="inline-flex items-center gap-2 rounded-lg bg-primary-container px-5 py-2.5 font-label-md text-label-md font-semibold text-inverse-on-surface shadow-sm transition-all hover:opacity-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                              >
                                <span>
                                  {msg.deferral.type === 'eligibility' && t.assistant.eligibilityDeferral}
                                  {msg.deferral.type === 'fraud' && t.assistant.fraudDeferral}
                                  {msg.deferral.type === 'loan' && t.assistant.loanDeferral}
                                </span>
                                <span aria-hidden="true">→</span>
                              </Link>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {isLoading && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-outline-variant bg-surface-container-lowest px-4 py-3 shadow-sm">
                      <Spinner className="h-4 w-4" />
                      <span className="font-body-sm text-body-sm text-on-surface-variant">
                        {t.assistant.loading}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Error */}
              {error && <Alert variant="danger" title={error} className="rounded-2xl" />}

              {/* ─────────── DEDICATED INPUT CONSOLE ─────────── */}
              <div className="space-y-3 rounded-2xl bg-surface-container-lowest p-4 shadow-sm lg:p-5">
                <div className="rounded-xl bg-surface-container-low p-3 transition-all focus-within:bg-surface-container focus-within:ring-2 focus-within:ring-secondary">
                  <textarea
                    ref={inputRef}
                    id="assistant-query-input"
                    rows={3}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={t.assistant.inputPlaceholder}
                    disabled={isLoading}
                    aria-label={t.assistant.inputPlaceholder}
                    className="w-full resize-none bg-transparent font-body-md text-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none"
                  />
                  {/* Control tray */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleClear}
                      disabled={isLoading}
                      className="rounded-lg px-2.5 py-1.5 font-label-sm text-label-sm text-on-surface-variant transition-colors hover:text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary disabled:opacity-50"
                    >
                      {c.clearLabel}
                    </button>
                    <div className="flex items-center gap-3">
                      <span className="hidden font-label-sm text-label-sm text-on-surface-variant sm:inline">
                        {c.keyboardHint}
                      </span>
                      <Button
                        onClick={handleSend}
                        disabled={isLoading || !input.trim()}
                        isLoading={isLoading}
                        aria-label={t.assistant.send}
                        className="gap-2 rounded-lg px-5 font-label-md text-label-md"
                      >
                        <span>{c.sendLabel}</span>
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-tertiary-fixed">
                          <ArrowUp className="h-3 w-3 text-primary-container" aria-hidden="true" />
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
                {/* Privacy / advisory footnote */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                  <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-on-surface-variant">
                    <Lock className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
                    {c.footnote}
                  </span>
                  <span className="font-label-sm text-label-sm font-semibold text-secondary">
                    {c.helplineLabel}: {HELPLINE_CYBERCRIME}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

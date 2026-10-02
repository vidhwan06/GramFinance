'use client';

import React, { useState, useCallback } from 'react';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { FraudInput } from './FraudInput';
import { FraudResult } from './FraudResult';
import type { FraudCheckResult } from '@/lib/fraud/types';
import { cn } from '@/lib/utils/cn';

/**
 * Main Fraud Checker container.
 *
 * Orchestrates the input → result flow. Manages all state:
 *   - text input
 *   - loading state
 *   - error state
 *   - result data
 *
 * Calls the /api/fraud/check endpoint and renders the response.
 * The UI never calculates risk — it only displays what the server returns.
 */
export function FraudChecker({ className }: { className?: string }) {
  const { t } = useLanguage();
  const [result, setResult] = useState<FraudCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (text: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/fraud/check', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inputType: 'message', text }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const body = (await response.json()) as {
        success: boolean;
        data?: FraudCheckResult;
      };

      if (!body.success || !body.data) {
        throw new Error('Invalid response');
      }

      setResult(body.data);
    } catch {
      setError(t.fraud.errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  const handleRetry = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  return (
    <div className={cn('space-y-space-lg', className)}>
      <FraudInput
        onSubmit={handleSubmit}
        isLoading={isLoading}
        hasError={!!error}
        errorMessage={error}
      />
      {result && (
        <FraudResult
          result={result}
          isLoading={isLoading}
          onRetry={handleRetry}
        />
      )}
    </div>
  );
}

/** displayName for dev tools. */
FraudChecker.displayName = 'FraudChecker';

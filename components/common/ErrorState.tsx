import React from 'react';
import { Button } from '@/components/ui/Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-coral/10 rounded-2xl border-2 border-coral/30 my-6">
      <div className="w-16 h-16 rounded-full bg-coral/10 flex items-center justify-center text-coral text-2xl font-bold mb-4">
        ⚠️
      </div>
      <h3 className="text-xl font-bold text-seal-red mb-2">{title}</h3>
      <p className="text-base text-coral max-w-md mb-6">{message}</p>
      {onRetry && (
        <Button variant="danger" onClick={onRetry}>
          Try Again
        </Button>
      )}
    </div>
  );
}

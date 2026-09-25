import React from 'react';
import { Spinner } from '@/components/ui/Spinner';

export interface LoadingStateProps {
  message?: string;
}

export function LoadingState({ message = 'Loading...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center min-h-[300px]">
      <Spinner size="lg" className="mb-4" />
      <p className="text-lg font-medium text-gray-700">{message}</p>
    </div>
  );
}

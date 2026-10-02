import React, { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';

export interface EmptyStateProps {
  icon?: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  children?: ReactNode;
}

export function EmptyState({
  icon = '📂',
  title,
  description,
  actionLabel,
  onAction,
  children,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center bg-warm-ivory rounded-2xl border-2 border-dashed border-rule my-6">
      <div className="text-4xl mb-4">{icon}</div>
      <h3 className="text-xl font-bold text-ink mb-2">{title}</h3>
      <p className="text-base text-muted-ink max-w-md mb-6">{description}</p>
      {actionLabel && onAction && (
        <Button variant="primary" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {children}
    </div>
  );
}

'use client';

import React from 'react';
import { SchemeCard } from './SchemeCard';
import { EmptyState } from '@/components/common/EmptyState';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import type { SchemeListItem } from '../schemes-service';

export interface SchemeCatalogueProps {
  schemes: SchemeListItem[];
}

/**
 * The catalogue grid.
 *
 * A Client Component purely so it can read the active language from the existing
 * provider. The data was already fetched on the server and arrives as a plain
 * serialisable prop, so no Supabase call happens in the browser and no draft
 * scheme can be smuggled in through the client bundle.
 */
export function SchemeCatalogue({ schemes }: SchemeCatalogueProps) {
  const { t, language } = useLanguage();

  if (schemes.length === 0) {
    return (
      <EmptyState
        title={t.schemes.emptyTitle}
        description={t.schemes.emptyMessage}
      />
    );
  }

  return (
    <>
      <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schemes.map((scheme) => (
          <li key={scheme.id}>
            <SchemeCard
              scheme={scheme}
              language={language}
              labels={{
                view: t.schemes.viewScheme,
                check: t.schemes.checkEligibility,
                forWhom: t.schemes.forWhom,
                allStates: t.schemes.allStates,
                lastVerified: t.schemes.lastVerified,
              }}
            />
          </li>
        ))}
      </ul>
    </>
  );
}

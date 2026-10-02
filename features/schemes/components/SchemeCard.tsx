import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { SchemeListItem } from '../schemes-service';

export interface SchemeCardProps {
  scheme: SchemeListItem;
  language: 'en' | 'kn';
  labels: {
    view: string;
    check: string;
    forWhom: string;
    allStates: string;
    lastVerified: string;
  };
}

/** Keeps a card readable without hiding the description entirely. */
const CARD_DESCRIPTION_LIMIT = 220;

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}...`;
}

/**
 * One scheme in the catalogue.
 *
 * Shows only what the record actually holds. There is no benefit figure, loan
 * limit or interest rate here, because the database has no such columns and
 * inventing them would be a fabrication presented to the people least able to
 * check it.
 */
export function SchemeCard({ scheme, language, labels }: SchemeCardProps) {
  const name = language === 'kn' ? scheme.nameKn : scheme.nameEn;
  const description = language === 'kn' ? scheme.descriptionKn : scheme.descriptionEn;
  const isNationwide = scheme.states.length === 0 || scheme.states.includes('ALL');

  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle className="text-lg">{name}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1 space-y-3">
        <p className="text-sm text-muted-ink leading-relaxed">
          {truncate(description, CARD_DESCRIPTION_LIMIT)}
        </p>

        {scheme.targetGroups.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-ink mb-1">{labels.forWhom}</p>
            <ul className="flex flex-wrap gap-1.5">
              {scheme.targetGroups.map((group) => (
                <li key={group}>
                  <Badge variant="neutral">{group}</Badge>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-ink">
          {isNationwide ? (
            labels.allStates
          ) : (
            <>
              {scheme.states.join(', ')}
            </>
          )}
        </p>

        <p className="text-xs text-muted">
          {labels.lastVerified}:{' '}
          <time dateTime={scheme.lastVerified}>{scheme.lastVerified}</time>
        </p>
      </CardContent>

      <div className="flex flex-wrap gap-2 pt-3 border-t border-rule">
        <Link
          href={`/schemes/${scheme.id}`}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-lg border-2 border-deep-teal px-4 py-2 text-base font-medium text-deep-teal transition-colors hover:bg-deep-teal/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-seal-red focus-visible:ring-offset-2"
        >
          {labels.view}
        </Link>
        <Link
          href={`/schemes/${scheme.id}#check`}
          className="inline-flex min-h-[48px] flex-1 items-center justify-center rounded-lg bg-deep-teal px-4 py-2 text-base font-medium text-white transition-colors hover:bg-deep-teal focus:outline-none focus-visible:ring-2 focus-visible:ring-seal-red focus-visible:ring-offset-2"
        >
          {labels.check}
        </Link>
      </div>
    </Card>
  );
}

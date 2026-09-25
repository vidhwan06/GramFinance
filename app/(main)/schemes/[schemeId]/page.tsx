import React from 'react';
import { notFound } from 'next/navigation';
import { SchemeDetailView } from '@/features/schemes/components/SchemeDetailView';
import { ErrorState } from '@/components/common/ErrorState';
import { getActiveSchemeWithDetails } from '@/features/schemes/schemes-service';
import { en as t } from '@/features/language/translations/en';

/**
 * One published scheme.
 *
 * A Server Component. The read goes through the anon-key client, so a draft,
 * inactive or expired scheme is invisible here at the database level, not just
 * filtered out afterwards.
 *
 * `notFound()` is used for both "no such scheme" and "not published", so the
 * page cannot be used to discover unpublished work. It renders the nearest
 * `not-found` boundary, which is `app/(main)/schemes/[schemeId]/not-found.tsx`,
 * so the app shell (header and bottom navigation) is preserved.
 */

export const dynamic = 'force-dynamic';

export default async function SchemeDetailPage({
  params,
}: {
  params: Promise<{ schemeId: string }>;
}) {
  const { schemeId } = await params;

  let scheme;
  try {
    scheme = await getActiveSchemeWithDetails(schemeId);
  } catch (error) {
    console.error('[schemes] detail load failed', error);
    return <ErrorState title={t.schemes.errorTitle} message={t.schemes.errorMessage} />;
  }

  if (!scheme) notFound();

  return <SchemeDetailView scheme={scheme} />;
}

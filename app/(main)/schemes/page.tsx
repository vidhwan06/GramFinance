import React from 'react';
import { SchemeCatalogue } from '@/features/schemes/components/SchemeCatalogue';
import { SchemesPageHeader } from '@/features/schemes/components/SchemesPageHeader';
import { ErrorState } from '@/components/common/ErrorState';
import { listActiveSchemes } from '@/features/schemes/schemes-service';
import { en as t } from '@/features/language/translations/en';

/**
 * The published scheme catalogue.
 *
 * A Server Component. The read happens here, on the server, through the
 * anon-key client, so row-level security applies exactly as it does in the
 * browser: a draft, inactive or expired scheme is never fetched, so it cannot
 * be rendered. The `status = 'active'` filter is defence in depth on top of the
 * RLS policy.
 *
 * The result is handed to a Client Component as a plain serialisable prop so the
 * existing language switcher keeps working. The layout no longer applies a
 * page-wide container (Stitch sections own their width), so the catalogue
 * declares its own here.
 */

export const dynamic = 'force-dynamic';

export default async function SchemesPage() {
  let schemes;

  try {
    schemes = await listActiveSchemes();
  } catch (error) {
    console.error('[schemes] catalogue load failed', error);
    return (
      <ErrorState title={t.schemes.errorTitle} message={t.schemes.errorMessage} />
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
      <SchemesPageHeader />

      <SchemeCatalogue schemes={schemes} />
    </div>
  );
}

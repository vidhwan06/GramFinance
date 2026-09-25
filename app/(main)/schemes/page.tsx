import React from 'react';
import { SchemeCatalogue } from '@/features/schemes/components/SchemeCatalogue';
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
 * existing language switcher keeps working. `PageContainer` is already applied
 * by `app/(main)/layout.tsx`, so it is deliberately not repeated here.
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
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
          {t.schemes.title}
        </h1>
        <p className="text-sm sm:text-base text-gray-600">{t.schemes.subtitle}</p>
      </header>

      <SchemeCatalogue schemes={schemes} />
    </div>
  );
}

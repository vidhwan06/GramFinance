import { redirect } from 'next/navigation';

/**
 * Legacy standalone route at `/fraud-checker`.
 *
 * The scam inspector now lives at `/check` (the `app/(main)/check` route),
 * where it shares the app shell, bilingual copy and the same
 * `/api/fraud/check` endpoint. This redirect keeps any old link or bookmark
 * working without maintaining a second copy of the experience.
 */
export default function FraudCheckerPage() {
  redirect('/check');
}

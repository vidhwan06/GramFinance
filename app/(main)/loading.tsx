import { LoadingState } from '@/components/common/LoadingState';

/**
 * Loading UI for every page inside the (main) group.
 *
 * Next.js shows this automatically while a route segment is being fetched or
 * streamed, so a slow connection no longer leaves a blank white screen with no
 * indication that anything is happening.
 *
 * A Server Component: it must not use hooks or context, so the copy is plain
 * English rather than routed through `useLanguage`.
 */
export default function MainLoading() {
  return <LoadingState message="Loading…" />;
}

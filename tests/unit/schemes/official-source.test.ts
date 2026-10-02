import { describe, it, expect, vi } from 'vitest';

// schemes-service imports lib/supabase/server, which imports next/headers.
// classifyOfficialSource is a pure function, but the module graph still has to
// resolve, so the server client is stubbed out rather than booted.
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));

import { classifyOfficialSource } from '@/features/schemes/schemes-service';

/**
 * F10: a scheme's `official_url` must never be able to become a script link.
 *
 * `new URL()` validates that a string is a URL. It does NOT validate that the
 * URL is safe to put in an `href`, and it accepts the schemes that matter here:
 *
 *   new URL('javascript:alert(1)')  ->  protocol 'javascript:', hostname ''
 *
 * The empty hostname is why this slipped through. `classifyOfficialSource`
 * decided "resolves to a real authority" purely from reserved-TLD suffixes on
 * the hostname, and `''` does not end in `.invalid`, `.test`, `.example` or
 * `.localhost` -- so a `javascript:` URL scored as a perfectly good official
 * portal.
 *
 * `OfficialSourceLink` renders that value straight into `<a href={source.url}>`
 * with `rel="noopener noreferrer"`, which does nothing for an inline script,
 * and CSP does not help either because `script-src` allows `'unsafe-inline'`.
 *
 * The path is not reachable today: `schemes.official_url` has no INSERT/UPDATE
 * policy and the client roles hold no UPDATE grant (verified live -- PATCH and
 * DELETE both return 42501), so only the service role can write the column.
 * This is the allowlist that keeps it unreachable if that ever changes.
 */

describe('classifyOfficialSource -- protocol allowlist (F10)', () => {
  it('rejects a javascript: URL', () => {
    const result = classifyOfficialSource('javascript:alert(1)');

    expect(result.isResolving).toBe(false);
    expect(result.host).toBe('');
    // The dangerous value must not survive into anything the UI renders.
    expect(result.url).not.toContain('javascript:');
    expect(result.url).toBe('');
  });

  it('rejects a data: URL', () => {
    const result = classifyOfficialSource('data:text/html,<script>alert(1)</script>');

    expect(result.isResolving).toBe(false);
    expect(result.host).toBe('');
    expect(result.url).toBe('');
  });

  it('rejects an ftp: URL', () => {
    const result = classifyOfficialSource('ftp://example.com/scheme');

    expect(result.isResolving).toBe(false);
    expect(result.host).toBe('');
    expect(result.url).toBe('');
  });

  it('accepts http: where existing behaviour expects it', () => {
    const result = classifyOfficialSource('http://www.rbi.org.in/');

    expect(result.isResolving).toBe(true);
    expect(result.host).toBe('www.rbi.org.in');
    expect(result.url).toBe('http://www.rbi.org.in/');
  });

  it('accepts https:', () => {
    const result = classifyOfficialSource('https://pmkisan.gov.in/');

    expect(result.isResolving).toBe(true);
    expect(result.host).toBe('pmkisan.gov.in');
    expect(result.url).toBe('https://pmkisan.gov.in/');
  });

  it('rejects the remaining script-bearing and local schemes too', () => {
    // Same class of risk as javascript:, covered together so the allowlist
    // cannot be quietly widened later without failing a test.
    for (const url of [
      'vbscript:msgbox(1)',
      'file:///etc/passwd',
      'blob:https://example.com/abc',
      'about:blank',
    ]) {
      const result = classifyOfficialSource(url);
      expect(result.isResolving, url).toBe(false);
      expect(result.host, url).toBe('');
      expect(result.url, url).toBe('');
    }
  });
});

describe('classifyOfficialSource -- pre-existing behaviour is preserved (F10)', () => {
  it('still flags a reserved non-resolving TLD while keeping the url', () => {
    // This is the demo-fixture and mistyped-URL case. The url MUST be retained
    // so the UI can show what was stored; only the protocol check above drops it.
    const result = classifyOfficialSource('https://example.invalid/x');

    expect(result.isResolving).toBe(false);
    expect(result.host).toBe('example.invalid');
    expect(result.url).toBe('https://example.invalid/x');
  });

  it('covers every reserved TLD it claims to', () => {
    for (const host of ['a.invalid', 'a.test', 'a.example', 'a.localhost']) {
      expect(classifyOfficialSource(`https://${host}/x`).isResolving, host).toBe(false);
    }
  });

  it('lowercases the hostname but preserves url casing and path', () => {
    const result = classifyOfficialSource('https://Example.INVALID/Path?a=B');

    expect(result.host).toBe('example.invalid');
    expect(result.url).toBe('https://Example.INVALID/Path?a=B');
  });

  it('keeps the original fallback for an empty or unparseable value', () => {
    // Unchanged from before F10: nothing to display means nothing is displayed,
    // and the url is echoed so a malformed stored value is still visible.
    for (const url of ['', 'not a url', '://missing-scheme']) {
      const result = classifyOfficialSource(url);
      expect(result.isResolving, url).toBe(false);
      expect(result.host, url).toBe('');
      expect(result.url, url).toBe(url);
    }
  });

  it('does not treat a bare hostname as a source', () => {
    const result = classifyOfficialSource('pmkisan.gov.in');

    expect(result.isResolving).toBe(false);
    expect(result.url).toBe('pmkisan.gov.in');
  });

  it('still accepts a realistic production portal', () => {
    const result = classifyOfficialSource('https://adcl.karnataka.gov.in/27/ganga-kalyana-scheme/en');

    expect(result.isResolving).toBe(true);
    expect(result.host).toBe('adcl.karnataka.gov.in');
  });
});
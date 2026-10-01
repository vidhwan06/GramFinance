import type { NextConfig } from "next";

/**
 * Response headers applied to every route (MED-02).
 *
 * ── Content-Security-Policy ─────────────────────────────────────────────────
 * The app is same-origin end to end: every `fetch()` in the frontend targets
 * `/api/...`, fonts are self-hosted by `next/font` at build time, and Gemini is
 * called from the route handler only — so the browser needs no third-party
 * origin at all, and `connect-src 'self'` deliberately does NOT name Gemini.
 *
 * Two directives need `'unsafe-inline'`, and neither is a shortcut:
 *   * script-src — the Next.js App Router streams the RSC payload into inline
 *     `<script>` elements. Removing it requires a nonce handed down through
 *     middleware, which is an architectural change this pass does not take on.
 *   * style-src — React SSR emits inline `style=""` attributes (Progress,
 *     LoanBreakdown), which CSP otherwise strips, visibly breaking those bars.
 *
 * `unsafe-eval` is NOT permitted: nothing in the app needs it.
 * `frame-ancestors` supersedes X-Frame-Options for modern clients; the legacy
 * header is kept for older browsers.
 *
 * `upgrade-insecure-requests` is intentionally omitted: it would rewrite
 * http://localhost during development. Enable it alongside HSTS when the
 * deployment host is confirmed HTTPS-only.
 */
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "connect-src 'self'",
  "manifest-src 'self'",
  "worker-src 'self'",
].join('; ');

const securityHeaders = [
  { key: 'Content-Security-Policy', value: CONTENT_SECURITY_POLICY },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Two years, subdomains included. No `preload`: that list is effectively
  // irreversible. Browsers ignore this over http, so local development is safe.
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // None of these are used today. If camera-based OCR ships, `camera` must be
  // re-enabled here at the same time.
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
  },
  { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;

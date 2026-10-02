// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithLanguage } from './render-helper';
import { OfficialSourceLink } from '@/features/schemes/components/OfficialSourceLink';
import type { OfficialSource } from '@/features/schemes/schemes-service';

/**
 * F10: a rejected `official_url` must not reach an anchor's href.
 *
 * The unit test proves `classifyOfficialSource` refuses a `javascript:` URL.
 * That is necessary but not sufficient on its own: the value it returns is what
 * `OfficialSourceLink` puts in `href={source.url}`, and a validator that
 * returned the original string alongside `isResolving: false` would still ship a
 * live script link while looking correctly defused at the call site.
 *
 * So this asserts the property that actually matters, at the DOM boundary: no
 * anchor in the rendered output may carry a non-http(s) href.
 */

const LABELS = {
  label: 'Official source',
  warningLabel: 'This does not point at an official government portal.',
  lastVerifiedLabel: 'Last verified',
  lastVerified: '2026-09-26',
  language: 'en' as const,
};

const WARNING = LABELS.warningLabel;

function renderSource(source: OfficialSource, visitLabel?: string) {
  return renderWithLanguage(<OfficialSourceLink {...LABELS} source={source} visitLabel={visitLabel} />);
}

function anchorHrefs(container: HTMLElement): string[] {
  return Array.from(container.querySelectorAll('a')).map((a) => a.getAttribute('href') ?? '');
}

describe('OfficialSourceLink -- compact mode', () => {
  it('renders the href for an accepted https source', () => {
    const { container } = renderSource({
      url: 'https://pmkisan.gov.in/',
      host: 'pmkisan.gov.in',
      isResolving: true,
    });

    expect(anchorHrefs(container)).toEqual(['https://pmkisan.gov.in/']);
  });

  it('still shows the stored url for a reserved TLD, but keeps the warning', () => {
    const { container } = renderSource({
      url: 'https://example.invalid/x',
      host: 'example.invalid',
      isResolving: false,
    });

    // Unchanged pre-F10 behaviour: a mistyped but harmless address stays visible
    // so a maintainer can see what was stored.
    expect(anchorHrefs(container)).toEqual(['https://example.invalid/x']);
    expect(screen.getByText(WARNING)).toBeDefined();
  });

  it('renders no script href when the source was rejected', () => {
    // Exactly what classifyOfficialSource returns for a javascript: URL.
    const { container } = renderSource({ url: '', host: '', isResolving: false });

    for (const href of anchorHrefs(container)) {
      expect(href).not.toMatch(/^\s*javascript:/i);
      expect(href).not.toMatch(/^\s*(data|vbscript|file|blob|about):/i);
    }
    // And the warning still explains why there is nothing to click.
    expect(screen.getByText(WARNING)).toBeDefined();
  });
});

describe('OfficialSourceLink -- strip mode (scheme detail)', () => {
  it('renders the href for an accepted http source', () => {
    const { container } = renderSource(
      { url: 'http://www.rbi.org.in/', host: 'www.rbi.org.in', isResolving: true },
      'Visit the portal'
    );

    expect(anchorHrefs(container)).toEqual(['http://www.rbi.org.in/']);
  });

  it('renders no script href in strip mode either', () => {
    // Strip mode is the scheme-detail CTA, the most prominent place a stored
    // official_url is rendered, so both layouts need the guarantee.
    const { container } = renderSource({ url: '', host: '', isResolving: false }, 'Visit the portal');

    for (const href of anchorHrefs(container)) {
      expect(href).not.toMatch(/^\s*javascript:/i);
      expect(href).not.toMatch(/^\s*(data|vbscript|file|blob|about):/i);
    }
  });
});
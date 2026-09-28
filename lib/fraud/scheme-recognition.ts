/**
 * Scheme Recognition
 *
 * Deterministic identification of government schemes mentioned in user input.
 *
 * Uses the existing GramFinance scheme catalogue (active schemes only).
 * Matching is deterministic: exact name matching with normalization.
 * No fuzzy/AI matching is used.
 *
 * If the system is uncertain, it returns no scheme match.
 */

import type { RecognizedScheme } from './types';
import type { SchemeListItem } from '@/features/schemes/schemes-service';

const MAX_NAME_LENGTH = 200;

/** Common aliases/abbreviations mapped to canonical scheme names */
const SCHEME_ALIASES: Record<string, string[]> = {
  'PM-KISAN': ['PM KISAN', 'Pradhan Mantri Kisan Samman Nidhi', 'Pm Kisan', 'Pradhan Mantri Kisan'],
  'PMUY': ['Pradhan Mantri Ujjwala Yojana', 'Pm Ujjwala', 'Ujjwala Yojana'],
  'PM-VISHWAKARMA': ['Pradhan Mantri Vishwakarma', 'Pm Vishwakarma', 'Pm Vishwa Karma'],
  'GANGA KALYAN': ['Ganga Kalyan Yojana', 'Ganga Kalyan Scheme'],
};

/**
 * Normalizes a scheme name for deterministic matching.
 */
function normalizeSchemeName(name: string): string {
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[_\-\s]+/g, ' ')
    .replace(/[^a-z0-9\s]/g, '')
    .trim();
}

/**
 * Build a lookup map from normalized name to scheme data.
 */
function buildSchemeLookup(schemes: SchemeListItem[]): Map<string, SchemeListItem> {
  const lookup = new Map<string, SchemeListItem>();

  for (const scheme of schemes) {
    const normalized = normalizeSchemeName(scheme.nameEn);
    if (normalized.length > 0 && normalized.length <= MAX_NAME_LENGTH) {
      if (!lookup.has(normalized)) {
        lookup.set(normalized, scheme);
      }
    }
  }

  return lookup;
}

/**
 * Try to match a candidate word/token against known schemes.
 */
function matchToken(
  token: string,
  lookup: Map<string, SchemeListItem>
): SchemeListItem | null {
  const cleaned = token.replace(/[^a-z0-9\s]/g, '').toLowerCase().trim();
  if (cleaned.length < 2) return null;

  // Direct normalized match
  if (lookup.has(cleaned)) {
    return lookup.get(cleaned)!;
  }

  // Check alias matches
  for (const aliases of Object.values(SCHEME_ALIASES)) {
    for (const alias of aliases) {
      if (normalizeSchemeName(alias) === cleaned) {
        for (const [, scheme] of lookup) {
          if (normalizeSchemeName(scheme.nameEn) === normalizeSchemeName(alias)) {
            return scheme;
          }
        }
      }
    }
  }

  return null;
}

/**
 * Recognize schemes mentioned in user input text.
 *
 * Uses the existing GramFinance active scheme catalogue.
 * Only matches when confident — returns empty array for uncertain input.
 *
 * @param text The user input text (already normalized)
 * @param activeSchemes The list of active schemes from the database
 * @returns Array of recognized schemes, deduplicated by schemeId
 */
export function recognizeSchemes(
  text: string,
  activeSchemes: SchemeListItem[]
): RecognizedScheme[] {
  if (!text || activeSchemes.length === 0) return [];

  const lookup = buildSchemeLookup(activeSchemes);
  const seen = new Set<string>();
  const results: RecognizedScheme[] = [];

  // Match individual tokens
  const tokens = text.split(/[^a-zA-Z0-9]+/).filter((w) => w.length >= 2);
  for (const token of tokens) {
    const scheme = matchToken(token, lookup);
    if (scheme && !seen.has(scheme.id)) {
      seen.add(scheme.id);
      results.push({
        schemeId: scheme.id,
        schemeCode: scheme.nameEn.replace(/\s+/g, '-').toUpperCase(),
        schemeName: scheme.nameEn,
        officialUrl: undefined,
        matchedText: scheme.nameEn,
      });
    }
  }

  // Also try matching full scheme names as substrings
  const normalizedText = text.toLowerCase().replace(/[_\-\s]+/g, ' ');
  for (const scheme of activeSchemes) {
    const normalizedName = normalizeSchemeName(scheme.nameEn);
    if (normalizedName.length >= 3 && normalizedText.includes(normalizedName)) {
      if (!seen.has(scheme.id)) {
        seen.add(scheme.id);
        results.push({
          schemeId: scheme.id,
          schemeCode: scheme.nameEn.replace(/\s+/g, '-').toUpperCase(),
          schemeName: scheme.nameEn,
          officialUrl: undefined,
          matchedText: scheme.nameEn,
        });
      }
    }
  }

  // Match multi-word aliases (e.g., "Pradhan Mantri Kisan Samman Nidhi")
  const cleanedTextNoSpaces = normalizedText.replace(/\s+/g, '');
  for (const [canonical, aliases] of Object.entries(SCHEME_ALIASES)) {
    for (const alias of aliases) {
      const normalizedAlias = normalizeSchemeName(alias).replace(/\s/g, '');
      if (normalizedAlias.length >= 3 && cleanedTextNoSpaces.includes(normalizedAlias)) {
        // Look up the canonical name in the lookup
        const canonicalNormalized = normalizeSchemeName(canonical);
        if (lookup.has(canonicalNormalized)) {
          const scheme = lookup.get(canonicalNormalized)!;
          if (!seen.has(scheme.id)) {
            seen.add(scheme.id);
            results.push({
              schemeId: scheme.id,
              schemeCode: scheme.nameEn.replace(/\s+/g, '-').toUpperCase(),
              schemeName: scheme.nameEn,
              officialUrl: undefined,
              matchedText: alias,
            });
          }
        }
      }
    }
  }

  return results;
}

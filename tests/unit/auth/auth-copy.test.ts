import { describe, it, expect } from 'vitest';
import { authCopy, type AuthCopy } from '@/features/auth/presentation/copy';
import { en } from '@/features/language/translations/en';
import { kn } from '@/features/language/translations/kn';

/**
 * Guards on the auth feature's bilingual copy.
 *
 * Two distinct concerns:
 *
 *   1. PARITY - `TranslationKeys` is derived from `en.ts`, so the two shared
 *      translation files must stay structurally identical. For the feature-local
 *      dictionary there is no compiler to catch a missing Kannada key, so it is
 *      asserted here instead. A missing key would render `undefined` in the UI.
 *
 *   2. HONESTY - this feature creates a lightweight anonymous session and NOT an
 *      account. Copy that implies otherwise is a real harm to the audience: it
 *      would lead someone to believe they have an account they could return to.
 *      The banned phrases below are the specific ways that misstatement is
 *      likely to be introduced later.
 */

const KEYS = Object.keys(authCopy.en) as Array<keyof AuthCopy>;

describe('auth copy parity', () => {
  it('exposes the same keys in both languages', () => {
    expect(Object.keys(authCopy.kn).sort()).toEqual(Object.keys(authCopy.en).sort());
  });

  it('has no empty or missing values in either language', () => {
    for (const lang of ['en', 'kn'] as const) {
      for (const key of KEYS) {
        const value = authCopy[lang][key];
        expect(typeof value, `${lang}.${key} must be a string`).toBe('string');
        expect(value.trim().length, `${lang}.${key} must not be empty`).toBeGreaterThan(0);
        expect(value, `${lang}.${key} must not be undefined`).not.toContain('undefined');
      }
    }
  });

  it('gives Kannada entries actual Kannada script, not English fallbacks', () => {
    // A copy-paste of the English string is the most likely parity regression,
    // and it would pass every other assertion in this file.
    const kannadaScript = /[\u0C80-\u0CFF]/;
    for (const key of KEYS) {
      expect(
        kannadaScript.test(authCopy.kn[key]),
        `kn.${key} should contain Kannada script`
      ).toBe(true);
    }
  });
});

describe('auth copy does not misrepresent the session as an account', () => {
  /**
   * Phrases that would tell a user they have something recoverable or personal
   * that this feature does not create.
   *
   * These are deliberately ASSERTIVE forms only. "No password, no email, no
   * phone number" is the correct and reassuring way to describe this flow, so a
   * bare /password/i ban would reject good copy. Each pattern therefore requires
   * a first-person or possessive construction that implies the credential
   * exists or is being asked for, rather than its absence.
   */
  const BANNED = [
    /your account/i,
    /create an account/i,
    /create your account/i,
    /sign in to your account/i,
    /recover your/i,
    /forget (your )?password/i,
    /enter your (password|email|phone)/i,
    /we (will )?(email|text) you a (code|link)/i,
    /verify your (email|phone|identity)/i,
    /your profile/i,
    /sign in again on/i,
    /stay signed in across/i,
  ];

  it('avoids account-shaped language in English', () => {
    for (const key of KEYS) {
      for (const pattern of BANNED) {
        expect(
          pattern.test(authCopy.en[key]),
          `en.${key} must not match ${pattern} — it implies a personal account`
        ).toBe(false);
      }
    }
  });

  it('states plainly that this is not an account', () => {
    expect(authCopy.en.pageAboutIsNot).toMatch(/not an account/i);
  });

  it('states plainly that there is no way to sign back in elsewhere', () => {
    // The most likely future over-promise: implying the session is portable.
    expect(authCopy.en.pageAboutIsNot).toMatch(/another device/i);
  });

  it('offers a one-tap action labelled Continue, not Sign in to a form', () => {
    expect(authCopy.en.signIn).toBe('Continue');
    expect(authCopy.kn.signIn).toBe(authCopy.kn.signIn.trim());
  });

  it('has a distinct loading label so the control is not silent while pending', () => {
    expect(authCopy.en.signingIn).not.toBe(authCopy.en.signIn);
    expect(authCopy.en.signingOut).not.toBe(authCopy.en.signOut);
  });
});

describe('the shared translation files stay structurally synchronized', () => {
  it('has identical key structure in en and kn', () => {
    const shape = (obj: Record<string, unknown>, prefix = ''): string[] =>
      Object.entries(obj)
        .flatMap(([key, value]) =>
          value !== null && typeof value === 'object'
            ? shape(value as Record<string, unknown>, `${prefix}${key}.`)
            : [`${prefix}${key}`]
        )
        .sort();

    expect(shape(kn as unknown as Record<string, unknown>)).toEqual(
      shape(en as unknown as Record<string, unknown>)
    );
  });

  it('keeps the feedback unauthorized copy asserting the same leading sentence', () => {
    // tests/ui/feedback asserts on this exact substring, and the auth flow now
    // handles the recovery. If either string drifts, the UI test breaks in a way
    // that looks like an auth bug rather than a copy change.
    expect(en.feedback.authRequiredMessage).toMatch(/^You must be signed in to submit feedback\./);
    expect(kn.feedback.authRequiredMessage).toMatch(/^ಅಭಿಪ್ರಾಯ ಸಲ್ಲಿಸಲು ನೀವು ಸೈನ್-ಇನ್ ಆಗಿರಬೇಕು\./);
  });
});

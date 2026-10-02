// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  renderWithLanguage,
  renderWithKannada,
  stubFetchByUrl,
  sessionResponse,
  signInResponse,
  unauthorizedResponse,
  feedbackOkResponse,
  type FetchStub,
} from './render-helper';
import { AuthControl } from '@/features/auth/components/AuthControl';
import { SignInNotice } from '@/features/auth/components/SignInNotice';
import { FeedbackForm } from '@/features/feedback/FeedbackForm';
import { authCopy } from '@/features/auth/presentation/copy';
import { kn } from '@/features/language/translations/kn';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

let stub: FetchStub | null = null;
afterEach(() => {
  stub?.restore();
  stub = null;
});

describe('AuthControl', () => {
  it('shows Continue when signed out', async () => {
    stub = stubFetchByUrl({ '/api/auth/session': () => sessionResponse(false) });
    renderWithLanguage(<AuthControl />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDefined();
    });
    expect(screen.queryByRole('button', { name: 'Sign out' })).toBeNull();
  });

  it('shows Sign out when signed in', async () => {
    stub = stubFetchByUrl({ '/api/auth/session': () => sessionResponse(true) });
    renderWithLanguage(<AuthControl />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeDefined();
    });
    expect(screen.queryByRole('button', { name: 'Continue' })).toBeNull();
  });

  it('renders no control until the session lookup resolves', () => {
    // Prevents a visible flicker, and avoids briefly offering a sign-in action
    // to someone who already has a session.
    stub = stubFetchByUrl({ '/api/auth/session': () => sessionResponse(true) });
    renderWithLanguage(<AuthControl />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('signs in on click and flips to the signed-in control', async () => {
    const user = userEvent.setup();
    let signedIn = false;
    stub = stubFetchByUrl({
      '/api/auth/session': () => sessionResponse(signedIn),
      '/api/auth/sign-in': () => {
        signedIn = true;
        return signInResponse();
      },
    });

    renderWithLanguage(<AuthControl />);
    await waitFor(() => screen.getByRole('button', { name: 'Continue' }));

    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Sign out' })).toBeDefined();
    });
  });

  it('signs out on click and flips back to Continue', async () => {
    const user = userEvent.setup();
    let signedIn = true;
    stub = stubFetchByUrl({
      '/api/auth/session': () => sessionResponse(signedIn),
      '/api/auth/sign-out': () => {
        signedIn = false;
        return { status: 200, body: { success: true, data: { signedIn: false } } };
      },
    });

    renderWithLanguage(<AuthControl />);
    await waitFor(() => screen.getByRole('button', { name: 'Sign out' }));

    await user.click(screen.getByRole('button', { name: 'Sign out' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDefined();
    });
  });

  it('never contacts Supabase directly, only same-origin routes', async () => {
    const user = userEvent.setup();
    let signedIn = false;
    stub = stubFetchByUrl({
      '/api/auth/session': () => sessionResponse(signedIn),
      '/api/auth/sign-in': () => {
        signedIn = true;
        return signInResponse();
      },
    });

    renderWithLanguage(<AuthControl />);
    await waitFor(() => screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => expect(stub!.calls.length).toBeGreaterThan(0));
    for (const call of stub!.calls) {
      expect(call.url.startsWith('/api/auth/')).toBe(true);
      expect(call.url).not.toContain('supabase');
    }
  });

  it('sends credentials so the session cookie travels with the request', async () => {
    const user = userEvent.setup();
    let signedIn = false;
    stub = stubFetchByUrl({
      '/api/auth/session': () => sessionResponse(signedIn),
      '/api/auth/sign-in': () => {
        signedIn = true;
        return signInResponse();
      },
    });

    renderWithLanguage(<AuthControl />);
    await waitFor(() => screen.getByRole('button', { name: 'Continue' }));
    await user.click(screen.getByRole('button', { name: 'Continue' }));

    await waitFor(() => {
      const signIn = stub!.calls.find((c) => c.url === '/api/auth/sign-in');
      expect(signIn).toBeDefined();
      expect(signIn!.init?.credentials).toBe('same-origin');
    });
  });
});

describe('AuthControl in Kannada', () => {
  // Labels are read from the dictionary rather than hardcoded, so a copy change
  // fails here as an intentional update instead of a mystery.
  it('renders the Kannada labels', async () => {
    stub = stubFetchByUrl({ '/api/auth/session': () => sessionResponse(false) });
    renderWithKannada(<AuthControl />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: authCopy.kn.signIn })).toBeDefined();
    });
  });

  it('renders the Kannada sign-out label when signed in', async () => {
    stub = stubFetchByUrl({ '/api/auth/session': () => sessionResponse(true) });
    renderWithKannada(<AuthControl />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: authCopy.kn.signOut })).toBeDefined();
    });
  });
});

describe('SignInNotice', () => {
  it('explains a one-tap session and offers a working control', async () => {
    const user = userEvent.setup();
    stub = stubFetchByUrl({ '/api/auth/sign-in': () => signInResponse() });

    const onSignedIn = vi.fn();
    renderWithLanguage(<SignInNotice onSignedIn={onSignedIn} />);

    expect(screen.getByText(authCopy.en.feedbackNoticeTitle)).toBeDefined();
    // Must state that no credential is needed, and must not imply an account.
    expect(authCopy.en.feedbackNoticeBody).toMatch(/do not need an email address or a password/i);
    expect(screen.getByText(authCopy.en.feedbackNoticeBody)).toBeDefined();

    await user.click(screen.getByRole('button', { name: 'Continue' }));
    await waitFor(() => expect(onSignedIn).toHaveBeenCalled());
  });
});

describe('FeedbackForm recovers from a 401 without re-entering the form', () => {
  let signedIn = false;

  beforeEach(() => {
    signedIn = false;
  });

  it('signs in and replays the rejected submission automatically', async () => {
    const user = userEvent.setup();
    stub = stubFetchByUrl({
      '/api/auth/sign-in': () => {
        signedIn = true;
        return signInResponse();
      },
      // The first feedback call is rejected; the replay succeeds.
      '/api/feedback': () => (signedIn ? feedbackOkResponse() : unauthorizedResponse()),
    });

    renderWithLanguage(<FeedbackForm />);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByLabelText(/Additional comments/), 'Great tool!');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    // The existing unauthorized state, now with a real control in it.
    await waitFor(() => {
      expect(screen.getByText('Sign-in required')).toBeDefined();
    });
    const retry = screen.getByRole('button', { name: 'Continue and send' });
    expect(retry).toBeDefined();

    await user.click(retry);

    // Success, with no further interaction from the user.
    await waitFor(() => {
      expect(screen.getByText('Thank you!')).toBeDefined();
    });

    const feedbackCalls = stub!.calls.filter((c) => c.url === '/api/feedback');
    expect(feedbackCalls).toHaveLength(2);
    expect(stub!.calls.some((c) => c.url === '/api/auth/sign-in')).toBe(true);

    // The replay must carry the ORIGINAL payload, not a re-read of cleared state.
    for (const call of feedbackCalls) {
      expect(JSON.parse(call.init?.body as string)).toEqual({
        module: 'loan',
        rating: 4,
        comment: 'Great tool!',
      });
    }
  });

  it('keeps the unauthorized state and the control when sign-in itself fails', async () => {
    const user = userEvent.setup();
    stub = stubFetchByUrl({
      '/api/auth/sign-in': () => ({
        status: 503,
        body: { success: false, error: { code: 'AUTH_UNAVAILABLE', message: 'unavailable' } },
      }),
      '/api/feedback': () => unauthorizedResponse(),
    });

    renderWithLanguage(<FeedbackForm />);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => screen.getByRole('button', { name: 'Continue and send' }));
    await user.click(screen.getByRole('button', { name: 'Continue and send' }));

    // No retry is attempted against /api/feedback after a failed sign-in.
    await waitFor(() => {
      expect(stub!.calls.filter((c) => c.url === '/api/feedback')).toHaveLength(1);
    });
    expect(screen.getByRole('button', { name: 'Continue and send' })).toBeDefined();
  });

  it('does not look up session state on mount', async () => {
    // A normal submission must still cost exactly one request.
    const user = userEvent.setup();
    stub = stubFetchByUrl({ '/api/feedback': () => feedbackOkResponse() });

    renderWithLanguage(<FeedbackForm />);
    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    await user.click(screen.getByRole('radio', { name: '5 stars' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => expect(screen.getByText('Thank you!')).toBeDefined());

    expect(stub!.calls).toHaveLength(1);
    expect(stub!.calls[0].url).toBe('/api/feedback');
  });

  it('renders the bilingual unauthorized state in Kannada', async () => {
    const user = userEvent.setup();
    stub = stubFetchByUrl({ '/api/feedback': () => unauthorizedResponse() });

    renderWithKannada(<FeedbackForm />);
    await user.selectOptions(screen.getByLabelText(kn.feedback.moduleLabel), 'loan');
    await user.click(screen.getByRole('radio', { name: /3/ }));
    await user.click(screen.getByRole('button', { name: kn.common.submit }));

    await waitFor(() => {
      expect(screen.getByText(kn.feedback.authRequiredTitle)).toBeDefined();
    });
    expect(
      screen.getByRole('button', { name: authCopy.kn.retryAfterSignIn })
    ).toBeDefined();
  });
});

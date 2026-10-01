// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLanguage, restoreFetch, stubFetch } from './render-helper';
import { FeedbackForm } from '@/features/feedback/FeedbackForm';

afterEach(() => {
  cleanup();
  restoreFetch();
  vi.restoreAllMocks();
});

// ── FeedbackForm Tests ──────────────────────────────────────────────────────

describe('FeedbackForm', () => {
  it('renders the form with all fields', () => {
    renderWithLanguage(<FeedbackForm />);

    expect(screen.getByLabelText('What is this feedback about?')).toBeDefined();
    expect(screen.getByRole('radiogroup', { name: 'How would you rate your experience?' })).toBeDefined();
    expect(screen.getByLabelText(/Additional comments/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDefined();
  });

  it('disables submit until module and rating are selected', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    const submitBtn = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    // Select a module
    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    expect(submitBtn.disabled).toBe(true);

    // Select a rating
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    expect(submitBtn.disabled).toBe(false);
  });

  it('submits the form with correct payload', async () => {
    const user = userEvent.setup();
    const { calls } = stubFetch(200, {
      success: true,
      data: { id: '123', module: 'loan', rating: 4, comment: null, createdAt: '2026-01-01' },
    });

    renderWithLanguage(<FeedbackForm />);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.type(screen.getByLabelText(/Additional comments/), 'Great tool!');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Thank you!')).toBeDefined();
    });

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/feedback');
    expect(calls[0].init?.method).toBe('POST');

    const body = JSON.parse(calls[0].init?.body as string);
    expect(body).toEqual({ module: 'loan', rating: 4, comment: 'Great tool!' });
  });

  it('sends comment as undefined when empty', async () => {
    const user = userEvent.setup();
    const { calls } = stubFetch(200, {
      success: true,
      data: { id: '123', module: 'general', rating: 5, comment: null, createdAt: '2026-01-01' },
    });

    renderWithLanguage(<FeedbackForm />);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'general');
    await user.click(screen.getByRole('radio', { name: '5 stars' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Thank you!')).toBeDefined();
    });

    const body = JSON.parse(calls[0].init?.body as string);
    expect(body).toEqual({ module: 'general', rating: 5, comment: undefined });
  });

  it('shows a distinct unauthorized message on 401', async () => {
    const user = userEvent.setup();
    stubFetch(401, {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'You must be signed in to submit feedback.' },
    });

    renderWithLanguage(<FeedbackForm />);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Sign-in required')).toBeDefined();
      expect(screen.getByText(/You must be signed in to submit feedback/)).toBeDefined();
    });

    // Should NOT show the generic error alert
    expect(screen.queryByText('An error occurred')).toBeNull();
  });

  it('shows generic error on 500', async () => {
    const user = userEvent.setup();
    stubFetch(500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Unable to save feedback. Please try again.' },
    });

    renderWithLanguage(<FeedbackForm />);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('An error occurred')).toBeDefined();
      expect(screen.getByText('Unable to save feedback. Please try again.')).toBeDefined();
    });
  });

  it('shows generic error on network failure', async () => {
    const user = userEvent.setup();
    (globalThis as { fetch: unknown }).fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    renderWithLanguage(<FeedbackForm />);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    await user.click(screen.getByRole('radio', { name: '3 stars' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeDefined();
    });
  });

  it('allows submitting another feedback after success', async () => {
    const user = userEvent.setup();
    stubFetch(200, {
      success: true,
      data: { id: '123', module: 'loan', rating: 4, comment: null, createdAt: '2026-01-01' },
    });

    renderWithLanguage(<FeedbackForm />);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByText('Thank you!')).toBeDefined();
    });

    await user.click(screen.getByRole('button', { name: 'Submit another feedback' }));

    // Form should be back to idle state
    expect(screen.getByLabelText('What is this feedback about?')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Submit' })).toBeDefined();
  });

  it('disables inputs while submitting', async () => {
    const user = userEvent.setup();
    // Never-resolving fetch to keep submitting state visible
    (globalThis as { fetch: unknown }).fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    renderWithLanguage(<FeedbackForm />);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');
    await user.click(screen.getByRole('radio', { name: '4 stars' }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Loading...' })).toBeDefined();
    });

    const moduleSelect = screen.getByLabelText('What is this feedback about?') as HTMLSelectElement;
    expect(moduleSelect.disabled).toBe(true);
  });
});

// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, cleanup } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLanguage, restoreFetch } from './render-helper';
import { FeedbackForm } from '@/features/feedback/FeedbackForm';

/**
 * Rating selection on the feedback form.
 *
 * Two distinct things are covered here, because they fail independently:
 *
 *   1. CLICKING each rating actually selects it. The previous suite only ever
 *      clicked "4 stars", so a control that ignored clicks on the other four
 *      would have passed. Each rating is now clicked on its own and the
 *      `aria-checked` state is asserted directly, rather than inferred from
 *      whether the submit button happened to enable.
 *
 *   2. The WAI-ARIA radiogroup KEYBOARD contract: roving tabindex plus arrow-key
 *      navigation. `role="radiogroup"` promises both. Without them, a keyboard
 *      or switch-device user who tabbed into the group had no way to change the
 *      rating at all, because arrow keys did nothing.
 */

afterEach(() => {
  cleanup();
  restoreFetch();
  vi.restoreAllMocks();
});

const RATING_LABELS = ['1 star', '2 stars', '3 stars', '4 stars', '5 stars'];

function radio(label: string) {
  return screen.getByRole('radio', { name: label }) as HTMLButtonElement;
}

/**
 * The currently selected rating's label, or null when nothing is selected.
 *
 * Uses `queryAllByRole`, not `getByRole`: `getBy` THROWS when no match is
 * found, so it cannot express "nothing is selected yet" — which is the state
 * this form starts in.
 */
function checkedLabel(): string | null {
  const selected = screen.queryAllByRole('radio', { checked: true });
  return selected.length === 1 ? selected[0].getAttribute('aria-label') : null;
}

describe('rating selection by click', () => {
  it('renders all five ratings, none selected initially', () => {
    renderWithLanguage(<FeedbackForm />);

    for (const label of RATING_LABELS) {
      expect(radio(label)).toBeDefined();
    }
    expect(checkedLabel()).toBeNull();
  });

  // One test per rating: a control that silently ignored, say, "2 stars" would
  // be caught here even though the old suite's single "4 stars" click passed.
  it.each(RATING_LABELS)('selects %s when clicked', async (label) => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    expect(checkedLabel()).toBeNull();
    await user.click(radio(label));

    expect(checkedLabel()).toBe(label);
    expect(radio(label).getAttribute('aria-checked')).toBe('true');
  });

  it('moves the selection when a different rating is clicked', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    await user.click(radio('2 stars'));
    expect(checkedLabel()).toBe('2 stars');

    await user.click(radio('5 stars'));
    expect(checkedLabel()).toBe('5 stars');
    // The previously selected one must be cleared, not left checked.
    expect(radio('2 stars').getAttribute('aria-checked')).toBe('false');
    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
  });

  it('exactly one rating is selected at a time after several clicks', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    for (const label of ['1 star', '3 stars', '2 stars', '4 stars', '5 stars']) {
      await user.click(radio(label));
    }

    expect(screen.getAllByRole('radio', { checked: true })).toHaveLength(1);
    expect(checkedLabel()).toBe('5 stars');
  });

  it('selection enables submit once a module is chosen', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    const submitBtn = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    expect(submitBtn.disabled).toBe(true);

    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'general');
    await user.click(radio('5 stars'));

    expect(checkedLabel()).toBe('5 stars');
    expect(submitBtn.disabled).toBe(false);
  });
});

describe('rating roving tabindex', () => {
  it('puts only the first rating in the tab order before anything is selected', () => {
    renderWithLanguage(<FeedbackForm />);

    expect(radio('1 star').tabIndex).toBe(0);
    for (const label of RATING_LABELS.slice(1)) {
      expect(radio(label).tabIndex, `${label} must be -1`).toBe(-1);
    }
  });

  it('moves the single tabbable rating to the selected one', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    await user.click(radio('4 stars'));

    expect(radio('4 stars').tabIndex).toBe(0);
    expect(radio('1 star').tabIndex).toBe(-1);
    const tabbable = RATING_LABELS.filter((l) => radio(l).tabIndex === 0);
    expect(tabbable).toEqual(['4 stars']);
  });
});

describe('rating keyboard navigation (WAI-ARIA radiogroup)', () => {
  it('ArrowRight advances and selects the next rating', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    radio('1 star').focus();
    await user.keyboard('{ArrowRight}');

    expect(checkedLabel()).toBe('2 stars');
    expect(document.activeElement).toBe(radio('2 stars'));
  });

  it('ArrowLeft moves back and selects the previous rating', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    await user.click(radio('4 stars'));
    await user.keyboard('{ArrowLeft}');

    expect(checkedLabel()).toBe('3 stars');
  });

  it('wraps from the last rating to the first', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    await user.click(radio('5 stars'));
    await user.keyboard('{ArrowRight}');

    expect(checkedLabel()).toBe('1 star');
  });

  it('wraps from the first rating to the last', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    radio('1 star').focus();
    await user.keyboard('{ArrowLeft}');

    expect(checkedLabel()).toBe('5 stars');
  });

  it('ArrowDown behaves like ArrowRight', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    radio('1 star').focus();
    await user.keyboard('{ArrowDown}');

    expect(checkedLabel()).toBe('2 stars');
  });

  it('ArrowUp behaves like ArrowLeft', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    await user.click(radio('3 stars'));
    await user.keyboard('{ArrowUp}');

    expect(checkedLabel()).toBe('2 stars');
  });

  it('Home selects the first rating and End the last', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    await user.click(radio('3 stars'));
    await user.keyboard('{End}');
    expect(checkedLabel()).toBe('5 stars');

    await user.keyboard('{Home}');
    expect(checkedLabel()).toBe('1 star');
  });

  it('arrow keys alone are enough to enable submit, with no mouse', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    const submitBtn = screen.getByRole('button', { name: 'Submit' }) as HTMLButtonElement;
    await user.selectOptions(screen.getByLabelText('What is this feedback about?'), 'loan');

    radio('1 star').focus();
    await user.keyboard('{ArrowRight}{ArrowRight}');

    expect(checkedLabel()).toBe('3 stars');
    expect(submitBtn.disabled).toBe(false);
  });

  it('leaves unrelated keys alone', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<FeedbackForm />);

    await user.click(radio('3 stars'));
    await user.keyboard('{Tab}');

    // Tab must not change the rating, only move focus on.
    expect(checkedLabel()).toBe('3 stars');
  });
});
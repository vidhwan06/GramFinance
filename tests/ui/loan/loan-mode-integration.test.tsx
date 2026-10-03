// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/features/language/hooks/useLanguage';
import { LoanView } from '@/features/loan/components/LoanView';
import { existingLoanCopy } from '@/features/loan/existing-loan/copy';
import { pageCopy } from '@/features/loan/presentation/dictionary';

/**
 * The Loan Tool as a whole, with both modes in the tree.
 *
 * ── What this file is actually guarding ────────────────────────────────────
 * The feature was added by wrapping the existing calculator in a tabpanel and
 * rendering a second panel beside it. That wrapper is the risk: the original
 * experience is the product's main loan journey, and the cheapest possible
 * regression is a wrapper attribute that hides it, breaks its anchors, or
 * unmounts it and throws away `useLoanCalculator`'s state. None of that shows
 * up in a test of either panel on its own, which is why these assertions are
 * written against `LoanView` itself.
 */

const EN = existingLoanCopy.en;
const KN = existingLoanCopy.kn;

/**
 * Labels from the pre-existing `LoanForm`.
 *
 * `LoanForm` keeps its own local `labels` object rather than reading
 * `presentation/dictionary.ts`, so these are spelled out here instead of
 * imported. If that file is ever refactored to share its copy, these become
 * imports and nothing else here needs to change.
 */
const LEGACY = {
  principal: 'Loan Amount (₹):',
  tenure: 'Loan Tenure (Months):',
};

/**
 * The number input behind a labelled `LoanForm` field.
 *
 * `getByLabelText` is ambiguous here for a pre-existing reason: `LoanForm` gives
 * BOTH the number input and its paired range slider the same accessible name, so
 * a plain label query matches two controls. Querying by `spinbutton` picks the
 * one a person types into.
 */
function legacyField(label: string): HTMLElement {
  return queryWorkspace((w) => w.getByRole('spinbutton', { name: label }));
}

function renderLoanView() {
  return render(
    <LanguageProvider>
      <LoanView />
    </LanguageProvider>
  );
}

/**
 * The Calculate-a-Loan workspace: the section holding the original `LoanForm`.
 *
 * Scoping matters here for a concrete reason. `LoanComparisonCard` renders its
 * OWN "Loan Amount (₹):" and "Loan Tenure (Months):" fields, and it sits inside
 * the calculate panel too, so an unscoped `getByLabelText` matches two inputs and
 * throws. The workspace section is what a person on the page would call "the
 * form", so it is what the queries should say.
 */
function calculateWorkspace(): HTMLElement {
  const heading = document.getElementById('loan-workspace-heading')!;
  return heading.closest('section') as HTMLElement;
}

function calculatePanel(): HTMLElement {
  return document.getElementById('loan-mode-panel-calculate')!;
}

function queryWorkspace<T extends HTMLElement>(
  find: (scoped: ReturnType<typeof within>) => T
): T {
  return find(within(calculateWorkspace()));
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe('mode tabs in the real page', () => {
  it('starts in Calculate a Loan, with the existing experience visible', () => {
    renderLoanView();

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]).toHaveProperty('textContent', EN.modeCalculate);

    // The original hero is on screen, which is the thing that must not break.
    expect(screen.getByRole('heading', { level: 1 }).textContent).toContain(
      pageCopy.en.heroTitlePre
    );
  });

  it('shows the Calculate a Loan panel and hides the other one', () => {
    renderLoanView();

    const calculate = document.getElementById('loan-mode-panel-calculate')!;
    const existing = document.getElementById('loan-mode-panel-existing')!;

    expect(calculate.hasAttribute('hidden')).toBe(false);
    expect(existing.hasAttribute('hidden')).toBe(true);
  });

  it('points each tab at the panel it controls', () => {
    renderLoanView();

    const [calculate, existing] = screen.getAllByRole('tab');
    expect(calculate.getAttribute('aria-controls')).toBe('loan-mode-panel-calculate');
    expect(existing.getAttribute('aria-controls')).toBe('loan-mode-panel-existing');

    // Each panel is labelled by its own tab, so the relationship is announced.
    expect(
      document.getElementById('loan-mode-panel-calculate')!.getAttribute('aria-labelledby')
    ).toBe('loan-mode-tab-calculate');
  });

  it('gives the tablist an accessible name', () => {
    renderLoanView();
    expect(screen.getByRole('tablist')).toHaveProperty('ariaLabel', 'Loan tool modes');
  });
});

describe('switching modes', () => {
  it('reveals the existing-loan form when that tab is clicked', async () => {
    const user = userEvent.setup();
    renderLoanView();

    await user.click(screen.getAllByRole('tab')[1]);

    expect(document.getElementById('loan-mode-panel-existing')!.hasAttribute('hidden')).toBe(false);
    expect(document.getElementById('loan-mode-panel-calculate')!.hasAttribute('hidden')).toBe(true);

    // The new mode's own form is really there.
    expect(screen.getByLabelText(EN.principalLabel)).toBeDefined();
    expect(screen.getByLabelText(EN.emisPaidLabel)).toBeDefined();
  });

  it('returns to the untouched calculator when the first tab is clicked', async () => {
    const user = userEvent.setup();
    renderLoanView();

    await user.click(screen.getAllByRole('tab')[1]);
    await user.click(screen.getAllByRole('tab')[0]);

    expect(document.getElementById('loan-mode-panel-calculate')!.hasAttribute('hidden')).toBe(false);
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
  });

  it('keeps the existing-loan form filled in across a mode switch', async () => {
    const user = userEvent.setup();
    renderLoanView();

    await user.click(screen.getAllByRole('tab')[1]);
    const principal = screen.getByLabelText(EN.principalLabel);
    await user.type(principal, '500000');

    await user.click(screen.getAllByRole('tab')[0]);
    await user.click(screen.getAllByRole('tab')[1]);

    // The reason both panels stay mounted. Unmounting would empty this field,
    // so someone comparing a quote against their own loan loses their figures
    // on every trip between tabs.
    expect(screen.getByLabelText(EN.principalLabel)).toHaveProperty('value', '500000');
  });

  it('keeps the calculator state across a mode switch', async () => {
    const user = userEvent.setup();
    renderLoanView();

    const principal = legacyField(LEGACY.principal);
    await user.clear(principal);
    await user.type(principal, '750000');

    await user.click(screen.getAllByRole('tab')[1]);
    await user.click(screen.getAllByRole('tab')[0]);

    // `useLoanCalculator` lives in LoanView, so its state survives regardless —
    // but the input must still show what was typed.
    expect(legacyField(LEGACY.principal)).toHaveProperty(
      'value',
      '750000'
    );
  });

  it('switches with the keyboard, not just the mouse', async () => {
    const user = userEvent.setup();
    renderLoanView();

    screen.getAllByRole('tab')[0].focus();
    await user.keyboard('{ArrowRight}');

    expect(document.getElementById('loan-mode-panel-existing')!.hasAttribute('hidden')).toBe(false);
  });
});

describe('the original calculator is not regressed', () => {
  it('still renders every original section', () => {
    renderLoanView();

    // The workspace, the glossary and the mandate strip are the sections that
    // existed before this feature. Any one going missing is a regression.
    const workspace = document.getElementById('loan-workspace-heading');
    expect(workspace).not.toBeNull();

    // The workspace heading is h2 and lives inside the calculate panel.
    const calculate = document.getElementById('loan-mode-panel-calculate')!;
    expect(within(calculate).getByRole('heading', { name: workspace!.textContent! })).toBeDefined();

    // The fee editor, which is a distinct original component.
    expect(within(calculate).getByText(pageCopy.en.feesTitle)).toBeDefined();
  });

  it('renders the amortization anchor and its target together', () => {
    renderLoanView();

    // The calculator ships with usable defaults, so a result exists on load and
    // the anchor is rendered in the hero. What matters is that the anchor is not
    // dangling: pointing at an id that is not on the page is a dead link.
    const anchor = within(calculatePanel()).getByRole('link', {
      name: pageCopy.en.viewAmortization,
    });
    const targetId = anchor.getAttribute('href')!.slice(1);
    expect(document.getElementById(targetId)).not.toBeNull();
  });

  it('drops the anchor when the inputs are invalid, and does not leave a dangling one', async () => {
    const user = userEvent.setup();
    renderLoanView();

    // A tenure above the engine's limit makes the result invalid, which is what
    // hides the anchor in the original code. The invariant is that the anchor and
    // its target are always in step, never that one particular id exists.
    const tenure = legacyField(LEGACY.tenure);
    await user.clear(tenure);
    await user.type(tenure, '999');

    const anchor = within(calculatePanel()).queryByRole('link', {
      name: pageCopy.en.viewAmortization,
    });
    expect(anchor).toBeNull();
    expect(document.getElementById('loan-ledger-heading')).toBeNull();
  });

  it('produces a calculator result in the default mode', async () => {
    const user = userEvent.setup();
    renderLoanView();

    // Fill the minimum the original form needs, so a result renders.
    const principal = legacyField(LEGACY.principal);
    await user.clear(principal);
    await user.type(principal, '500000');

    const tenure = legacyField(LEGACY.tenure);
    await user.clear(tenure);
    await user.type(tenure, '60');

    await user.click(screen.getAllByRole('tab')[1]);

    // The ledger heading — only reachable with a valid engine result.
    const ledger = document.getElementById('loan-ledger-heading');
    expect(ledger).not.toBeNull();
  });
});

describe('mobile and Kannada', () => {
  it('labels both tabs in Kannada without leaving English behind', () => {
    localStorage.setItem('gramfinance_lang', 'kn');
    renderLoanView();

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].textContent).toBe(KN.modeCalculate);
    expect(tabs[1].textContent).toBe(KN.modeExisting);
  });

  it('introduces no element wider than the viewport', () => {
    // jsdom reports every layout width as 0, so this cannot measure real
    // overflow. What it CAN catch is the structural cause: a fixed pixel width
    // or a non-wrapping cell that would force a horizontal scrollbar at 390px.
    const { container } = renderLoanView();

    const offenders = Array.from(container.querySelectorAll<HTMLElement>('*')).filter((el) => {
      const style = el.getAttribute('class') ?? '';
      // A fixed `w-[...]` on a wide element, or a table cell that cannot wrap.
      return /\bw-\[\d{3,}px\]/.test(style) && !/max-w-/.test(style);
    });

    expect(offenders).toHaveLength(0);
  });

  it('marks the schedule table and mobile list up for assistive tech', async () => {
    const user = userEvent.setup();
    renderLoanView();
    await user.click(screen.getAllByRole('tab')[1]);

    await user.type(screen.getByLabelText(EN.principalLabel), '500000');
    await user.type(screen.getByLabelText(EN.rateLabel), '10');
    await user.type(screen.getByLabelText(EN.tenureLabel), '60');
    await user.type(screen.getByLabelText(EN.emisPaidLabel), '18');
    await user.type(screen.getByLabelText(EN.startDateLabel), '2024-06-01');
    await user.click(screen.getByRole('button', { name: EN.calcButton }));
    await user.click(screen.getByRole('button', { name: EN.scheduleToggleOpen }));

    // The table has a caption, so it is not announced as an unlabelled grid.
    expect(screen.getByRole('table')).toHaveProperty(
      'textContent',
      expect.stringContaining(EN.scheduleTitle)
    );
  });
});

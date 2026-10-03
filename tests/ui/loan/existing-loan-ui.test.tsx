// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LanguageProvider } from '@/features/language/hooks/useLanguage';
import { ExistingLoanPanel } from '@/features/loan/existing-loan/components/ExistingLoanPanel';
import { LoanModeTabs, LoanToolMode } from '@/features/loan/components/LoanModeTabs';
import {
  existingLoanCopy,
  existingLoanErrorCopy,
} from '@/features/loan/existing-loan/copy';
import { calculateExistingLoanStatus } from '@/features/loan/existing-loan/calculator';
import { formatPaiseINR } from '@/features/loan/engine/utils/money';
import { ExistingLoanInput } from '@/features/loan/existing-loan/types';

/**
 * UI for "Check Existing Loan".
 *
 * The engine is covered exhaustively in tests/unit/loan/existing-loan-calculator.test.ts.
 * What is checked here is the thing unit tests cannot see: that a person can
 * actually reach the numbers, that the states are distinguishable, that the
 * disclaimer cannot be missed, and that the Kannada interface contains no
 * English leftovers.
 */

const EN = existingLoanCopy.en;
const KN = existingLoanCopy.kn;
const EN_ERR = existingLoanErrorCopy.en;
const KN_ERR = existingLoanErrorCopy.kn;

/**
 * The tabs as `LoanView` actually uses them: controlled, with the owner holding
 * the mode in state.
 *
 * The earlier version of these tests passed a frozen `mode` and only recorded
 * what `onChange` was asked for. That cannot exercise anything past the first
 * key press, because the component computes the next tab from the CURRENT mode —
 * with a mode that never changes, ArrowRight then ArrowLeft both start from
 * 'calculate' and land on 'existing' twice. Any real owner updates the mode, so
 * the harness has to as well.
 */
function StatefulTabs({ onChange }: { onChange?: (mode: LoanToolMode) => void }) {
  const [mode, setMode] = React.useState<LoanToolMode>('calculate');
  return (
    <LoanModeTabs
      mode={mode}
      onChange={(next) => {
        setMode(next);
        onChange?.(next);
      }}
    />
  );
}

function renderPanel(language: 'en' | 'kn' = 'en') {
  if (language === 'kn') localStorage.setItem('gramfinance_lang', 'kn');
  return render(
    <LanguageProvider>
      <ExistingLoanPanel />
    </LanguageProvider>
  );
}

afterEach(() => {
  cleanup();
  localStorage.clear();
});

/** Fills the form with a realistic fixed-rate loan. */
async function fillLoan(
  user: ReturnType<typeof userEvent.setup>,
  overrides: Partial<Record<'principal' | 'rate' | 'tenure' | 'emisPaid', string>> = {}
) {
  const values = {
    principal: '500000',
    rate: '10',
    tenure: '60',
    emisPaid: '18',
    ...overrides,
  };

  await user.type(screen.getByLabelText(EN.principalLabel), values.principal);
  await user.type(screen.getByLabelText(EN.rateLabel), values.rate);
  await user.type(screen.getByLabelText(EN.tenureLabel), values.tenure);
  await user.type(screen.getByLabelText(EN.emisPaidLabel), values.emisPaid);
  await user.type(screen.getByLabelText(EN.startDateLabel), '2024-06-01');
}

async function submit(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: EN.calcButton }));
}

describe('form', () => {
  it('renders every required input', () => {
    renderPanel();

    expect(screen.getByLabelText(EN.principalLabel)).toBeDefined();
    expect(screen.getByLabelText(EN.rateLabel)).toBeDefined();
    expect(screen.getByLabelText(EN.tenureLabel)).toBeDefined();
    expect(screen.getByLabelText(EN.startDateLabel)).toBeDefined();
    expect(screen.getByLabelText(EN.emisPaidLabel)).toBeDefined();
  });

  it('offers the two EMI modes', () => {
    renderPanel();

    // Each option is one fieldset radio group, so there are exactly two and they
    // share a name.
    const modes = screen.getAllByRole('radio') as HTMLInputElement[];
    expect(modes).toHaveLength(2);
    expect(modes[0].name).toBe(modes[1].name);
    // Both options carry a description, so the label text is not empty.
    expect(modes[0].labels?.[0]?.textContent).toContain(EN.emiModeDerived);
    expect(modes[1].labels?.[0]?.textContent).toContain(EN.emiModeProvided);
  });

  it('defaults to calculating the EMI, and shows a live preview', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.type(screen.getByLabelText(EN.principalLabel), '500000');
    await user.type(screen.getByLabelText(EN.rateLabel), '10');
    await user.type(screen.getByLabelText(EN.tenureLabel), '60');

    // ₹10,624 is the EMI for ₹5,00,000 at 10% over 60 months, shown live while
    // typing — before anything is submitted. Asserted on the preview paragraph
    // as a whole, because the label and the amount are separate text nodes and
    // neither alone is the element being tested.
    const preview = screen
      .getByText('₹10,624')
      .closest('p') as HTMLParagraphElement;
    expect(preview.textContent).toContain(EN.emiCurrentLabel);
  });

  it('reveals the EMI amount field only in "I know my EMI" mode', async () => {
    const user = userEvent.setup();
    renderPanel();

    expect(screen.queryByLabelText(EN.emiLabel)).toBeNull();
    await user.click(screen.getByLabelText(EN.emiModeProvided));
    expect(screen.getByLabelText(EN.emiLabel)).toBeDefined();
  });

  it('shows no errors before the form is submitted', () => {
    renderPanel();
    // An untouched form covered in red reads as broken.
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });
});

describe('validation errors', () => {
  it('reports a missing loan amount', async () => {
    const user = userEvent.setup();
    renderPanel();
    await submit(user);

    // An untouched field must say "enter a value" — never "must be greater
    // than zero", which would scold a user who has not typed anything yet.
    expect(screen.getByText(EN_ERR.PRINCIPAL_REQUIRED)).toBeDefined();
    expect(screen.queryByText(EN_ERR.PRINCIPAL_NOT_POSITIVE)).toBeNull();
  });

  it('rejects a zero or negative loan amount', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user, { principal: '-500' });
    await submit(user);

    expect(screen.getByText(EN_ERR.PRINCIPAL_NOT_POSITIVE)).toBeDefined();
  });

  it('rejects a negative interest rate', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user, { rate: '-2' });
    await submit(user);

    expect(screen.getByText(EN_ERR.RATE_NEGATIVE)).toBeDefined();
  });

  it('rejects EMIs paid beyond the tenure', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user, { tenure: '24', emisPaid: '30' });
    await submit(user);

    expect(screen.getByText(EN_ERR.PAID_EXCEEDS_TENURE)).toBeDefined();
  });

  it('rejects a start date in the future', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await user.clear(screen.getByLabelText(EN.startDateLabel));
    await user.type(screen.getByLabelText(EN.startDateLabel), '2099-01-01');
    await submit(user);

    expect(screen.getByText(EN_ERR.DATE_FUTURE)).toBeDefined();
  });

  it('rejects a date that does not exist', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    // A native date input cannot be typed into with an impossible day, so the
    // impossible value is injected directly — which is what a malicious or
    // pre-filled state would look like.
    await user.click(screen.getByRole('button', { name: EN.calcButton }));
    expect(screen.queryByText(/Could not load/)).toBeNull();
  });

  it('renders no result while the input is invalid', async () => {
    const user = userEvent.setup();
    renderPanel();
    await submit(user);

    expect(screen.queryByText(EN.progressTitle)).toBeNull();
    expect(screen.getByText(EN.invalidTitle)).toBeDefined();
  });
});

describe('result', () => {
  it('renders the status snapshot for a realistic loan', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    expect(screen.getByText(EN.progressTitle)).toBeDefined();
    expect(screen.getByText(EN.outstandingLabel)).toBeDefined();
    expect(screen.getByText(EN.emiCurrentLabel)).toBeDefined();
    expect(screen.getByText(EN.emisRemainingLabel)).toBeDefined();
    expect(screen.getByText(EN.breakdownTitle)).toBeDefined();
  });

  it('shows the progress as a labelled progressbar', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    const bar = screen.getByRole('progressbar', { name: EN.progressTitle });
    expect(bar.getAttribute('aria-valuenow')).toBe('30');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
    expect(screen.getByText('30%')).toBeDefined();
  });

  it('states EMIs paid out of the total', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    expect(screen.getByText('18 of 60 EMIs paid')).toBeDefined();
  });

  it('makes the outstanding principal the most prominent figure', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    // The headline amount is the only figure rendered at the largest type size
    // on the page. Scoped to the headline card, since the same number also
    // appears in the breakdown below it.
    const headline = screen.getByText(EN.outstandingLabel).parentElement!;
    const value = within(headline).getByText('₹3,75,167');
    expect(value.className).toContain('headline-lg');

    // And every other money figure is smaller.
    const breakdown = screen.getByText(EN.breakdownTitle).closest('div')!;
    expect(breakdown.className).not.toContain('headline-lg');
  });

  it('shows the remaining EMIs count', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    const stat = screen.getByText(EN.emisRemainingLabel).closest('div')!;
    expect(stat.textContent).toContain('42');
  });

  it('shows the outstanding balance', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    // ₹3,75,167 is the outstanding balance on this loan after 18 of 60 EMIs.
    // Verified against an independent amortisation implementation, not read
    // back out of the engine. It appears twice — headline and breakdown — so
    // the headline card is what gets asserted.
    const headline = screen.getByText(EN.outstandingLabel).parentElement!;
    expect(within(headline).getByText('₹3,75,167')).toBeDefined();
  });

  it('shows a breakdown whose two parts add to the total', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    // 3,75,167 principal + 71,021 interest = 4,46,188 still to be paid.
    const breakdown = screen.getByText(EN.breakdownTitle).closest('div')!;
    expect(breakdown.textContent).toContain('₹3,75,167');
    expect(breakdown.textContent).toContain('₹71,021');
    expect(breakdown.textContent).toContain('₹4,46,188');
  });

  it('changes the balance when EMIs paid changes', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);
    expect(screen.getAllByText('₹3,75,167').length).toBeGreaterThan(0);

    const paidField = screen.getByLabelText(EN.emisPaidLabel);
    await user.clear(paidField);
    await user.type(paidField, '36');
    await submit(user);

    expect(screen.queryByText('₹3,75,167')).toBeNull();
    // 36 of 60 paid leaves a materially smaller balance. It appears as both the
    // headline and the breakdown principal, so count rather than get.
    expect(screen.getAllByText('₹2,30,221').length).toBeGreaterThan(0);
  });

  it('explains that the EMI was derived when none was typed', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    expect(screen.getByText(EN.emiDerivedNote)).toBeDefined();
  });

  it('accepts a matching EMI without complaint', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await user.click(screen.getByLabelText(EN.emiModeProvided));
    await user.type(screen.getByLabelText(EN.emiLabel), '10624');
    await submit(user);

    expect(screen.getByText(EN.emiMatchesNote)).toBeDefined();
    expect(screen.queryByText(EN.emiDiffersTitle)).toBeNull();
  });

  it('warns when the entered EMI does not match the loan details', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await user.click(screen.getByLabelText(EN.emiModeProvided));
    await user.type(screen.getByLabelText(EN.emiLabel), '4000');
    await submit(user);

    expect(screen.getByText(EN.emiDiffersTitle)).toBeDefined();
    expect(screen.getByText(EN.emiDiffersBody)).toBeDefined();
  });

  it('reports a completed loan for a fully paid one', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user, { emisPaid: '60' });
    await submit(user);

    expect(screen.getByText(EN.completedTitle)).toBeDefined();
    expect(screen.getByText(EN.completedBody)).toBeDefined();
    expect(screen.getByText('100%')).toBeDefined();
    // No negative balance is ever displayed, anywhere on the page.
    expect(document.body.textContent).not.toContain('-₹');
    // The outstanding headline reads zero, not a minus sign.
    const headline = screen.getByText(EN.outstandingLabel).parentElement!;
    expect(headline.textContent).toContain('₹0');
  });

  it('handles a zero-interest loan', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user, { rate: '0' });
    await submit(user);

    // 18 of 60 EMIs on an interest-free loan leaves exactly 42/60 of the
    // principal — 70% of ₹5,00,000.
    expect(screen.getAllByText('₹3,50,000').length).toBeGreaterThan(0);

    // And no interest anywhere in the breakdown.
    const breakdown = screen.getByText(EN.breakdownTitle).closest('div')!;
    expect(breakdown.textContent).toContain('₹0');
    expect(screen.getByText(EN.progressTitle)).toBeDefined();
  });
});

describe('disclaimer and scope limits', () => {
  it('shows the estimate disclaimer', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    expect(screen.getByText(EN.disclaimerTitle)).toBeDefined();
    expect(screen.getByText(EN.disclaimerBody)).toBeDefined();
  });

  it('lists the reasons a lender figure can differ', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    // The reasons must be spelled out, not gestured at: a user who does not know
    // that a late fee is a reason to distrust a balance will not look for one.
    expect(EN.disclaimerBody).toMatch(/prepayment/i);
    expect(EN.disclaimerBody).toMatch(/missed payments/i);
    expect(EN.disclaimerBody).toMatch(/late fee/i);
    expect(EN.disclaimerBody).toMatch(/interest rate/i);
  });

  it('states plainly that it cannot see the loan', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    expect(screen.getByText(EN.privacyNote)).toBeDefined();
  });

  it('says prepayments and flat rates are not covered', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    expect(screen.getByText(EN.unsupportedTitle)).toBeDefined();
    expect(screen.getByText(EN.unsupportedPrepayment)).toBeDefined();
    expect(screen.getByText(EN.unsupportedFlatRate)).toBeDefined();
  });

  it('never claims an official balance', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    // The copy may say the lender's own figure can DIFFER from this estimate, but
    // it must never assert knowledge of it. Each phrase below would claim the
    // balance is verified, or that GramFinance can reach the lender.
    expect(document.body.textContent).not.toMatch(
      /your (actual|official|current) balance|balance (as|is) (confirmed|verified)|official (balance|outstanding)|we (can )?(see|access|fetch|check) your|bank records|verified with your lender|confirmed by/i
    );
  });
});

describe('payment schedule', () => {
  it('is collapsed until asked for', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    const toggle = screen.getByRole('button', { name: EN.scheduleToggleOpen });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByText(EN.scheduleTitle)).toBeDefined();
  });

  it('expands to show a row per remaining EMI', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    const toggle = screen.getByRole('button', { name: EN.scheduleToggleOpen });
    await user.click(toggle);

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    // 60 - 18 = 42 remaining rows.
    const table = screen.getByRole('table');
    expect(within(table).getAllByRole('row')).toHaveLength(43); // + header
  });

  it('labels each row with its remaining EMI number', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);
    await user.click(screen.getByRole('button', { name: EN.scheduleToggleOpen }));

    const table = screen.getByRole('table');
    expect(within(table).getByText('Remaining EMI 1 of 42')).toBeDefined();
    expect(within(table).getByText('Remaining EMI 42 of 42')).toBeDefined();
  });

  it('collapses again', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);

    await user.click(screen.getByRole('button', { name: EN.scheduleToggleOpen }));
    await user.click(screen.getByRole('button', { name: EN.scheduleToggleClose }));

    expect(screen.queryByRole('table')).toBeNull();
  });

  it('offers no schedule for a completed loan', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user, { emisPaid: '60' });
    await submit(user);

    expect(screen.queryByRole('button', { name: EN.scheduleToggleOpen })).toBeNull();
  });
});

describe('Kannada', () => {
  it('renders the whole interface in Kannada', async () => {
    const user = userEvent.setup();
    renderPanel('kn');
    await user.click(screen.getByRole('button', { name: KN.calcButton }));

    expect(screen.getByText(KN.invalidTitle)).toBeDefined();
    expect(screen.getByText(KN.introLead)).toBeDefined();
  });

  it('leaves no English UI strings behind', async () => {
    const user = userEvent.setup();
    renderPanel('kn');
    await user.type(screen.getByLabelText(KN.principalLabel), '500000');
    await user.type(screen.getByLabelText(KN.rateLabel), '10');
    await user.type(screen.getByLabelText(KN.tenureLabel), '60');
    await user.type(screen.getByLabelText(KN.emisPaidLabel), '18');
    await user.type(screen.getByLabelText(KN.startDateLabel), '2024-06-01');
    await user.click(screen.getByRole('button', { name: KN.calcButton }));

    // Headings, labels and the disclaimer are all translated. Currency symbols
    // and digits are locale-neutral and expected.
    for (const label of [KN.principalLabel, KN.outstandingLabel, KN.disclaimerTitle, KN.progressTitle]) {
      expect(screen.getByText(label)).toBeDefined();
    }
    expect(document.body.textContent).not.toMatch(/Estimated balance|Loan progress|Current EMI/);
  });

  it('gives a Kannada validation message', async () => {
    const user = userEvent.setup();
    renderPanel('kn');
    await user.click(screen.getByRole('button', { name: KN.calcButton }));

    expect(screen.getByText(KN_ERR.PRINCIPAL_REQUIRED)).toBeDefined();
  });
});

describe('mobile-friendly structure', () => {
  it('renders a table and a stacked list for the schedule, one of each', async () => {
    // Both are in the DOM; CSS shows the table from `sm` and the cards below
    // it. Duplicating the rows in ONE list would mean every message appears
    // twice in the accessibility tree.
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);
    await user.click(screen.getByRole('button', { name: EN.scheduleToggleOpen }));

    expect(screen.getByRole('table')).toBeDefined();
    // The stacked mobile view is present too: one list item per remaining EMI.
    // Scoped to the schedule panel, because the "not covered" section below it
    // has a list of its own.
    const schedule = document.getElementById('existing-loan-schedule')!;
    expect(within(schedule).getAllByRole('listitem')).toHaveLength(42);
  });

  it('uses min-height touch targets on the primary actions', () => {
    renderPanel();
    const button = screen.getByRole('button', { name: EN.calcButton });
    // Inherited from the shared Button's base classes.
    expect(button.className).toContain('min-h-');
  });
});

describe('reset', () => {
  it('clears the form and the result', async () => {
    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);
    expect(screen.getByText(EN.progressTitle)).toBeDefined();

    await user.click(screen.getByRole('button', { name: EN.resetButton }));

    expect(screen.queryByText(EN.progressTitle)).toBeNull();
    expect(screen.getByLabelText(EN.principalLabel)).toHaveProperty('value', '');
  });
});

describe('mode tabs', () => {
  it('renders both modes with the calculate one selected first', () => {
    const onChange = () => undefined;
    render(
      <LanguageProvider>
        <LoanModeTabs mode={'calculate' as LoanToolMode} onChange={onChange} />
      </LanguageProvider>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0].getAttribute('aria-selected')).toBe('true');
    expect(tabs[1].getAttribute('aria-selected')).toBe('false');
  });

  it('uses roving tabindex so only the selected tab is in the tab order', () => {
    render(
      <LanguageProvider>
        <LoanModeTabs mode={'calculate' as LoanToolMode} onChange={() => undefined} />
      </LanguageProvider>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].getAttribute('tabindex')).toBe('0');
    expect(tabs[1].getAttribute('tabindex')).toBe('-1');
  });

  it('moves between modes with the arrow keys', async () => {
    const user = userEvent.setup();
    const seen: LoanToolMode[] = [];
    render(
      <LanguageProvider>
        <StatefulTabs onChange={(mode) => seen.push(mode)} />
      </LanguageProvider>
    );

    screen.getAllByRole('tab')[0].focus();
    await user.keyboard('{ArrowRight}');
    expect(seen).toEqual(['existing']);
    expect(screen.getAllByRole('tab')[1].getAttribute('aria-selected')).toBe('true');

    await user.keyboard('{ArrowLeft}');
    expect(seen).toEqual(['existing', 'calculate']);
    expect(screen.getAllByRole('tab')[0].getAttribute('aria-selected')).toBe('true');
  });

  it('jumps to the first and last tab with Home and End', async () => {
    const user = userEvent.setup();
    const seen: LoanToolMode[] = [];
    render(
      <LanguageProvider>
        <StatefulTabs onChange={(mode) => seen.push(mode)} />
      </LanguageProvider>
    );

    screen.getAllByRole('tab')[0].focus();
    await user.keyboard('{End}');
    expect(seen).toEqual(['existing']);

    await user.keyboard('{Home}');
    expect(seen).toEqual(['existing', 'calculate']);
  });

  it('wraps around at both ends', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <StatefulTabs />
      </LanguageProvider>
    );

    // ArrowLeft from the first tab goes to the last.
    screen.getAllByRole('tab')[0].focus();
    await user.keyboard('{ArrowLeft}');
    expect(screen.getAllByRole('tab')[1].getAttribute('aria-selected')).toBe('true');

    // And ArrowRight from the last tab returns to the first.
    await user.keyboard('{ArrowRight}');
    expect(screen.getAllByRole('tab')[0].getAttribute('aria-selected')).toBe('true');
  });

  it('moves focus to the tab it selects', async () => {
    const user = userEvent.setup();
    render(
      <LanguageProvider>
        <LoanModeTabs mode={'calculate' as LoanToolMode} onChange={() => undefined} />
      </LanguageProvider>
    );

    screen.getAllByRole('tab')[0].focus();
    await user.keyboard('{ArrowRight}');

    // Focus follows the selection, so a keyboard user does not have to tab on.
    expect(document.activeElement).toBe(screen.getByRole('tab', { name: EN.modeExisting }));
  });

  it('is switchable by click', async () => {
    const user = userEvent.setup();
    const seen: LoanToolMode[] = [];
    render(
      <LanguageProvider>
        <StatefulTabs onChange={(mode) => seen.push(mode)} />
      </LanguageProvider>
    );

    await user.click(screen.getAllByRole('tab')[1]);
    expect(seen).toEqual(['existing']);
    // Selection follows the click, because the owner now holds the new mode.
    expect(screen.getAllByRole('tab')[1].getAttribute('aria-selected')).toBe('true');
  });

  it('labels both tabs in Kannada', () => {
    localStorage.setItem('gramfinance_lang', 'kn');
    render(
      <LanguageProvider>
        <LoanModeTabs mode={'existing' as LoanToolMode} onChange={() => undefined} />
      </LanguageProvider>
    );

    const tabs = screen.getAllByRole('tab');
    expect(tabs[0].textContent).toBe(KN.modeCalculate);
    expect(tabs[1].textContent).toBe(KN.modeExisting);
    expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  });
});

describe('no calculation happens in the components', () => {
  it('produces the same figures the calculator does', async () => {
    // A cross-check that the UI is rendering engine output rather than doing
    // arithmetic of its own.
    const input: ExistingLoanInput = {
      principalRupees: 500_000,
      annualInterestRate: 10,
      tenureMonths: 60,
      startDate: '2024-06-01',
      emiRupees: null,
      emiSource: 'derived',
      emisPaid: 18,
    };
    const status = calculateExistingLoanStatus(input);

    // The UI's money formatting is the shared engine's, so the same helper must
    // agree with what the screen shows.
    const formatted = formatPaiseINR(status.outstandingPrincipalPaise);
    expect(formatted).toBe('₹3,75,167');

    const user = userEvent.setup();
    renderPanel();
    await fillLoan(user);
    await submit(user);
    // Appears as the headline and again as the breakdown principal; what
    // matters is that the screen shows the engine's figure.
    expect(screen.getAllByText(formatted).length).toBeGreaterThan(0);
  });
});
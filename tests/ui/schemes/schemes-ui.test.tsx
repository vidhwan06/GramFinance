// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLanguage, restoreFetch, stubFetch } from './render-helper';
import { SchemeCatalogue } from '@/features/schemes/components/SchemeCatalogue';
import { SchemeDetailView } from '@/features/schemes/components/SchemeDetailView';
import { EligibilityForm } from '@/features/schemes/components/EligibilityForm';
import type { SchemeDetail, SchemeListItem } from '@/features/schemes/schemes-service';
import type { SchemeOutcome } from '@/features/schemes/eligibility/check-eligibility-service';
import type { EligibilityStatus, RuleEvaluation } from '@/features/schemes/types';

const LABELS = {
  formTitle: 'Tell us about yourself',
  formHelp: 'We only ask for what this scheme needs.',
  checkButton: 'Check my eligibility',
  checking: 'Checking...',
  addInformation: 'Add more information',
  errorTitle: 'Could not load schemes',
  fieldRequired: 'This answer is needed to check this scheme.',
};

const SCHEME: SchemeListItem = {
  id: '3f2504e0-4f89-11d3-9a0c-0305e82c3301',
  nameEn: 'Test Scheme',
  nameKn: 'à²ªà²°à³€à²•à³à²·à²¾ à²¯à³‹à²œà²¨à³†',
  descriptionEn:
    'This description is deliberately longer than the card limit so that the catalogue shows a readable summary rather than the entire column. '.repeat(3),
  descriptionKn: 'à²’à²‚à²¦à³ à²µà²¿à²µà²°à²£à³†',
  targetGroups: ['farmer'],
  states: ['Karnataka'],
  lastVerified: '2026-09-26',
  status: 'active',
};

afterEach(() => {
  restoreFetch();
  vi.restoreAllMocks();
});

describe('SchemeCatalogue', () => {
  it('renders a card per active scheme', () => {
    renderWithLanguage(<SchemeCatalogue schemes={[SCHEME]} />);
    expect(screen.getByText('Test Scheme')).toBeDefined();
  });

  it('shows only the fields the record holds, and no invented figures', () => {
    renderWithLanguage(<SchemeCatalogue schemes={[SCHEME]} />);
    expect(screen.getByText('farmer')).toBeDefined();
    expect(screen.getByText('Karnataka')).toBeDefined();
    expect(screen.getByText(/2026-09-26/)).toBeDefined();
    // Nothing that would have to be fabricated.
    expect(screen.queryByText(/interest subsidy/i)).toBeNull();
    expect(screen.queryByText(/loan up to/i)).toBeNull();
  });

  it('truncates a long description instead of dumping the whole column', () => {
    renderWithLanguage(<SchemeCatalogue schemes={[SCHEME]} />);
    expect(screen.getByText(/deliberately longer than the card limit/)).toBeDefined();
    expect(screen.getByText(/\.\.\.$/)).toBeDefined();
  });

  it('links to the detail page for this scheme only', () => {
    renderWithLanguage(<SchemeCatalogue schemes={[SCHEME]} />);
    const links = screen.getAllByRole('link') as HTMLAnchorElement[];
    const hrefs = links.map((l) => l.getAttribute('href'));
    expect(hrefs).toContain(`/schemes/${SCHEME.id}`);
    expect(hrefs).toContain(`/schemes/${SCHEME.id}#check`);
  });

  it('shows the empty state when nothing is published', () => {
    renderWithLanguage(<SchemeCatalogue schemes={[]} />);
    expect(screen.getByText('No schemes available right now')).toBeDefined();
  });
});

describe('SchemeDetailView condition rendering', () => {
  const RULES: SchemeDetail['rules'] = [
    {
      id: 'r1',
      schemeId: SCHEME.id,
      ruleGroup: 1,
      groupOperator: 'AND',
      ruleType: 'eligibility',
      field: 'age',
      operator: '>=',
      value: 18,
      required: true,
      descriptionEn: 'Applicant must be 18 or older',
      descriptionKn: null,
      priority: 1,
      createdAt: '2026-09-26T00:00:00.000Z',
    },
    {
      id: 'r2',
      schemeId: SCHEME.id,
      ruleGroup: 1,
      groupOperator: 'AND',
      ruleType: 'eligibility',
      field: 'annualIncome',
      operator: '<=',
      value: 500000,
      required: true,
      descriptionEn: 'Annual income at or below 5 lakh rupees',
      descriptionKn: null,
      priority: 2,
      createdAt: '2026-09-26T00:00:00.000Z',
    },
  ];

  const DETAIL: SchemeDetail = {
    ...SCHEME,
    requiredDocuments: ['Identity document'],
    officialSource: { url: 'https://example.invalid/x', host: 'example.invalid', isResolving: false },
    requiredFields: ['age'],
    rules: RULES,
  };

  it('renders each authored rule exactly once', () => {
    const { container } = renderWithLanguage(<SchemeDetailView scheme={DETAIL} />);

    for (const rule of RULES) {
      const occurrences = [...container.querySelectorAll('li')].filter(
        (li) => li.textContent?.includes(rule.descriptionEn!) === true
      ).length;
      expect(occurrences, `"${rule.descriptionEn}" rendered ${occurrences} times`).toBe(1);
    }
  });

  it('renders one condition row per stored rule, with no invented rows', () => {
    renderWithLanguage(<SchemeDetailView scheme={DETAIL} />);

    // Scoped to the conditions list, not every list on the page: the document
    // checklist is a separate <ul> and would otherwise be counted too.
    const conditions = screen.getByTestId('scheme-conditions');
    expect(conditions.querySelectorAll('li')).toHaveLength(DETAIL.rules.length);
  });

  it('does not hide genuinely distinct rules that share a field', () => {
    // Deduplicating in the UI would be wrong: two rules on the same field with
    // different thresholds are two real conditions.
    const twoThresholds: SchemeDetail = {
      ...DETAIL,
      rules: [
        { ...RULES[0], id: 'a', value: 18, descriptionEn: 'Lower bound' },
        { ...RULES[0], id: 'b', value: 25, descriptionEn: 'Preferred minimum' },
      ],
    };

    renderWithLanguage(<SchemeDetailView scheme={twoThresholds} />);
    expect(screen.getByText('Lower bound')).toBeDefined();
    expect(screen.getByText('Preferred minimum')).toBeDefined();
  });

  it('shows the form for the fields the server asked for', () => {
    renderWithLanguage(<SchemeDetailView scheme={DETAIL} />);
    expect(screen.getByLabelText('Age')).toBeDefined();
    expect(screen.queryByLabelText('Annual income')).toBeNull();
  });

  it('warns when the stored source is not a resolvable official portal', () => {
    renderWithLanguage(<SchemeDetailView scheme={DETAIL} />);
    expect(
      screen.getByText(/not an official government portal/)
    ).toBeDefined();
  });
});

describe('EligibilityForm field rendering', () => {
  it('renders exactly the fields the server asked for', () => {
    renderWithLanguage(
      <EligibilityForm
        schemeId={SCHEME.id}
        requiredFields={['age', 'occupation', 'existingLoan']}
        language="en"
        labels={LABELS}
      />
    );

    expect(screen.getByLabelText('Age')).toBeDefined();
    expect(screen.getByLabelText('Occupation')).toBeDefined();
    expect(screen.getByLabelText('Already have an existing loan')).toBeDefined();
  });

  it('renders a different set when the server asks for a different set', () => {
    // The form has no list of its own, so this must change with no code edit.
    renderWithLanguage(
      <EligibilityForm
        schemeId={SCHEME.id}
        requiredFields={['state', 'loanPurpose']}
        language="en"
        labels={LABELS}
      />
    );

    expect(screen.getByLabelText('State')).toBeDefined();
    expect(screen.getByLabelText('Loan purpose')).toBeDefined();
    expect(screen.queryByLabelText('Age')).toBeNull();
  });

  it('uses a number control for numbers and a text control for strings', () => {
    renderWithLanguage(
      <EligibilityForm
        schemeId={SCHEME.id}
        requiredFields={['age', 'occupation']}
        language="en"
        labels={LABELS}
      />
    );

    expect((screen.getByLabelText('Age') as HTMLInputElement).type).toBe('number');
    expect((screen.getByLabelText('Occupation') as HTMLInputElement).type).toBe('text');
  });
});

describe('EligibilityForm validation', () => {
  it('does not submit and shows a message for a missing answer', async () => {
    const user = userEvent.setup();
    const { calls } = stubFetch(200, { success: true, data: { results: [], disclaimer: {} } });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));

    expect(screen.getByText('This answer is needed to check this scheme.')).toBeDefined();
    expect(calls).toHaveLength(0);
  });

  it('rejects an out-of-range age before sending anything', async () => {
    const user = userEvent.setup();
    const { calls } = stubFetch(200, { success: true, data: { results: [], disclaimer: {} } });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    await user.type(screen.getByLabelText('Age'), '500');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));

    expect(screen.getByText('Enter an age between 0 and 120.')).toBeDefined();
    expect(calls).toHaveLength(0);
  });

  it('cannot receive letters in a number control, so they are not a reachable error', async () => {
    const user = userEvent.setup();
    const { calls } = stubFetch(200, { success: true, data: { results: [], disclaimer: {} } });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    const input = screen.getByLabelText('Age') as HTMLInputElement;
    await user.type(input, 'abc');

    // A number input silently discards non-numeric keystrokes, so the field
    // stays empty and the user gets the "required" message instead. The
    // "Enter a number" branch exists for values the browser can hold but the
    // engine cannot read, not for typing letters.
    expect(input.value).toBe('');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));
    expect(screen.getByText('This answer is needed to check this scheme.')).toBeDefined();
    expect(calls).toHaveLength(0);
  });
});

function outcomeFor(status: EligibilityStatus): SchemeOutcome {
  const passed: RuleEvaluation[] = [
    {
      ruleId: 'r1',
      field: 'age',
      operator: '>=',
      expected: '18',
      actual: '30',
      outcome: 'pass',
      required: true,
      descriptionEn: null,
      descriptionKn: null,
      reason: 'satisfied',
    },
  ];

  const unknown: RuleEvaluation[] = [
    {
      ruleId: 'r2',
      field: 'annualIncome',
      operator: '<=',
      expected: '500000',
      actual: null,
      outcome: 'unknown',
      required: true,
      descriptionEn: null,
      descriptionKn: null,
      reason: 'missing_value',
    },
  ];

  const failed: RuleEvaluation[] =
    status === 'not_eligible'
      ? [
          {
            ruleId: 'r3',
            field: 'annualIncome',
            operator: '<=',
            expected: '500000',
            actual: '700000',
            outcome: 'fail',
            required: true,
            descriptionEn: null,
            descriptionKn: null,
            reason: 'not_satisfied',
          },
        ]
      : [];

  return {
    scheme: {
      id: SCHEME.id,
      nameEn: SCHEME.nameEn,
      nameKn: SCHEME.nameKn,
      status: 'active',
      lastVerified: SCHEME.lastVerified,
    },
    eligibility: {
      schemeId: SCHEME.id,
      status,
      passedRules: passed,
      failedRules: failed,
      unknownRules: unknown,
      missingInformation: status === 'eligible' ? [] : ['annualIncome'],
      groupResults: [],
      invalidRules: [],
    },
    requiredFields: ['age', 'annualIncome'],
  };
}

describe('EligibilityForm submission', () => {
  it('POSTs to the eligibility endpoint and never sends a verdict', async () => {
    const user = userEvent.setup();
    const disclaimer = {
      en: 'This is a preliminary assessment based on the information you provided.',
      kn: 'à²‡à²¦à³ à²ªà³à²°à²¾à²¥à²®à²¿à²• à²®à³Œà²²à³à²¯à²®à²¾à²ªà²¨à³† à²®à²¾à²¤à³à²°.',
    };
    const { calls } = stubFetch(200, {
      success: true,
      data: { results: [outcomeFor('potentially_eligible')], disclaimer },
    });

    renderWithLanguage(
      <EligibilityForm
        schemeId={SCHEME.id}
        requiredFields={['age']}
        language="en"
        labels={LABELS}
      />
    );

    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));

    expect(calls).toHaveLength(1);
    expect(calls[0].url).toBe('/api/schemes/eligibility');
    expect(calls[0].init?.method).toBe('POST');

    const body = JSON.parse(String(calls[0].init?.body)) as Record<string, unknown>;
    expect(body).toEqual({ schemeId: SCHEME.id, applicant: { age: 30 } });

    // The decisive assertion: the client has no way to state a result.
    for (const forbidden of ['verdict', 'eligible', 'status', 'result', 'score', 'isEligible']) {
      expect(Object.keys(body), `body must not contain "${forbidden}"`).not.toContain(forbidden);
    }
    expect(body.applicant).not.toHaveProperty('verdict');
  });

  it('renders the disclaimer the API returned', async () => {
    const user = userEvent.setup();
    const disclaimer = {
      en: 'This is a preliminary assessment based on the information you provided.',
      kn: 'x',
    };
    stubFetch(200, {
      success: true,
      data: { results: [outcomeFor('eligible')], disclaimer },
    });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));

    expect(screen.getByText(disclaimer.en)).toBeDefined();
  });

  it.each([
    ['potentially_eligible', 'More information is needed'],
    ['not_eligible', 'This scheme does not match the information provided'],
    ['eligible', 'You appear to meet the conditions we checked'],
  ] as Array<[EligibilityStatus, string]>)('renders the %s state', async (status, heading) => {
    const user = userEvent.setup();
    stubFetch(200, {
      success: true,
      data: { results: [outcomeFor(status)], disclaimer: { en: 'disclaimer', kn: 'disclaimer' } },
    });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));

    expect(screen.getByText(heading)).toBeDefined();
  });

  it('shows what is still needed for a potentially eligible result', async () => {
    const user = userEvent.setup();
    stubFetch(200, {
      success: true,
      data: {
        results: [outcomeFor('potentially_eligible')],
        disclaimer: { en: 'disclaimer', kn: 'disclaimer' },
      },
    });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));

    // The missing field is named, not just implied.
    expect(screen.getAllByText('Annual income').length).toBeGreaterThan(0);
    expect(screen.getByText('Still needed')).toBeDefined();
  });

  it('distinguishes PASS from UNKNOWN without relying on colour alone', async () => {
    const user = userEvent.setup();
    stubFetch(200, {
      success: true,
      data: {
        results: [outcomeFor('potentially_eligible')],
        disclaimer: { en: 'disclaimer', kn: 'disclaimer' },
      },
    });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));

    // Each row carries a screen-reader status word as well as its glyph.
    expect(screen.getByText('Satisfied:')).toBeDefined();
    expect(screen.getByText('Needs information:')).toBeDefined();
  });

  it('returns to the form with the answers intact', async () => {
    const user = userEvent.setup();
    stubFetch(200, {
      success: true,
      data: {
        results: [outcomeFor('potentially_eligible')],
        disclaimer: { en: 'disclaimer', kn: 'disclaimer' },
      },
    });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    const input = screen.getByLabelText('Age') as HTMLInputElement;
    await user.type(input, '30');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));
    await user.click(screen.getByRole('button', { name: 'Add more information' }));

    expect((screen.getByLabelText('Age') as HTMLInputElement).value).toBe('30');
  });

  it('shows a safe message for a 404 without leaking a server message', async () => {
    const user = userEvent.setup();
    stubFetch(404, { success: false, error: { message: 'relation "public.scheme_rules" does not exist' } });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));

    expect(screen.getAllByText('Could not load schemes').length).toBeGreaterThan(0);
    expect(screen.queryByText(/does not exist/)).toBeNull();
  });

  it('shows a safe message for a server error', async () => {
    const user = userEvent.setup();
    stubFetch(500, { success: false, error: { message: 'ECONNRESET at /srv/app/api/x' } });

    renderWithLanguage(
      <EligibilityForm schemeId={SCHEME.id} requiredFields={['age']} language="en" labels={LABELS} />
    );

    await user.type(screen.getByLabelText('Age'), '30');
    await user.click(screen.getByRole('button', { name: 'Check my eligibility' }));

    expect(screen.queryByText(/ECONNRESET/)).toBeNull();
    expect(screen.getAllByText('Could not load schemes').length).toBeGreaterThan(0);
  });
});

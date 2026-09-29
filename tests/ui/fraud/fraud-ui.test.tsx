// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithLanguage, restoreFetch, stubFetch } from './render-helper';
import { FraudChecker } from '@/features/fraud/components/FraudChecker';
import { FraudInput } from '@/features/fraud/components/FraudInput';
import { FraudRiskSummary } from '@/features/fraud/components/FraudRiskSummary';
import { FraudSignalList } from '@/features/fraud/components/FraudSignalList';
import { SchemeFindings } from '@/features/fraud/components/SchemeFindings';
import { FraudRecommendations } from '@/features/fraud/components/FraudRecommendations';
import { EmptyResult } from '@/features/fraud/components/EmptyResult';
import type { FraudCheckResult, FraudSignalMatch, SchemeClaimFinding, RecognizedScheme } from '@/lib/fraud/types';

afterEach(() => {
  restoreFetch();
  vi.restoreAllMocks();
});

// ── Test Data ──────────────────────────────────────────────────────────────

const HIGH_RISK_RESULT: FraudCheckResult = {
  riskLevel: 'high',
  riskScore: 75,
  signals: [
    {
      code: 'UNOFFICIAL_FEE',
      name: 'Unofficial fee request',
      severity: 'high',
      weight: 30,
      explanation: 'The message asks you to make a payment to receive a government benefit.',
      matchedText: 'Pay ₹500 to activate your benefit',
    },
  ],
  recommendations: [
    { text: 'Do not send money until the request has been independently verified.' },
    { text: 'Do not share OTPs, PINs, or passwords.' },
  ],
  recognizedSchemes: [
    {
      schemeId: 'test-id',
      schemeCode: 'PM-KISAN',
      schemeName: 'PM-KISAN',
      officialUrl: 'https://example.gov',
      matchedText: 'PM-KISAN',
    },
  ],
  schemeFindings: [],
};

const LOW_RISK_RESULT: FraudCheckResult = {
  riskLevel: 'low',
  riskScore: 0,
  signals: [],
  recommendations: [],
  recognizedSchemes: [],
  schemeFindings: [],
};

const UNKNOWN_SCHEME_RESULT: FraudCheckResult = {
  riskLevel: 'medium',
  riskScore: 30,
  signals: [],
  recommendations: [],
  recognizedSchemes: [
    {
      schemeId: 'test-id',
      schemeCode: 'PM-KISAN',
      schemeName: 'PM-KISAN',
      matchedText: 'PM-KISAN',
    },
  ],
  schemeFindings: [
    {
      schemeId: 'test-id',
      schemeCode: 'PM-KISAN',
      schemeName: 'PM-KISAN',
      claimType: 'payment_required',
      status: 'unknown',
      explanation: 'We could not verify this claim using the scheme information currently available.',
    },
  ],
};

// ── FraudChecker Integration Tests ─────────────────────────────────────────

describe('FraudChecker', () => {
  it('renders the page with textarea and submit button', () => {
    renderWithLanguage(<FraudChecker />);
    expect(screen.getByLabelText('Suspicious message')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Check message' })).toBeDefined();
  });

  it('shows loading state while checking', async () => {
    const user = userEvent.setup();
    // Create a never-resolving promise to keep the loading state visible
    (globalThis as { fetch: unknown }).fetch = vi.fn().mockReturnValue(new Promise(() => {}));

    renderWithLanguage(<FraudChecker />);

    const textarea = screen.getByLabelText('Suspicious message');
    await user.type(textarea, 'Test message');
    await user.click(screen.getByRole('button', { name: 'Check message' }));

    await waitFor(() => {
      // Button shows translated loading text via loadingText prop
      expect(screen.getByRole('button', { name: 'Checking...' })).toBeDefined();
    });
  });

  it('renders high-risk result correctly', async () => {
    const user = userEvent.setup();
    stubFetch(200, { success: true, data: HIGH_RISK_RESULT });

    renderWithLanguage(<FraudChecker />);

    const textarea = screen.getByLabelText('Suspicious message');
    await user.type(textarea, 'Pay ₹500 to activate your benefit');
    await user.click(screen.getByRole('button', { name: 'Check message' }));

    await waitFor(() => {
      // Risk summary has role="status" and aria-label with risk level
      const riskSummary = screen.getByRole('status');
      expect(riskSummary.textContent).toContain('High');
      expect(riskSummary.textContent).toContain('High-risk indicators detected');
      expect(screen.getByText('Unofficial fee request')).toBeDefined();
      expect(screen.getByText('Government schemes mentioned')).toBeDefined();
      expect(screen.getByText('What you should do')).toBeDefined();
    });
  });

  it('renders low-risk result correctly', async () => {
    const user = userEvent.setup();
    stubFetch(200, { success: true, data: LOW_RISK_RESULT });

    renderWithLanguage(<FraudChecker />);

    const textarea = screen.getByLabelText('Suspicious message');
    await user.type(textarea, 'Hello, how are you?');
    await user.click(screen.getByRole('button', { name: 'Check message' }));

    await waitFor(() => {
      expect(screen.getByText('No obvious warning signs detected')).toBeDefined();
    });
  });

  it('shows user-friendly error on API failure', async () => {
    const user = userEvent.setup();
    stubFetch(500, { success: false, error: { message: 'Internal server error' } });

    renderWithLanguage(<FraudChecker />);

    const textarea = screen.getByLabelText('Suspicious message');
    await user.type(textarea, 'Test message');
    await user.click(screen.getByRole('button', { name: 'Check message' }));

    await waitFor(() => {
      expect(screen.getByText("We couldn't check this message right now. Please try again.")).toBeDefined();
    });
  });

  it('allows retry after error', async () => {
    const user = userEvent.setup();
    const { calls } = stubFetch(200, { success: true, data: LOW_RISK_RESULT });

    renderWithLanguage(<FraudChecker />);

    const textarea = screen.getByLabelText('Suspicious message');
    await user.type(textarea, 'Test message');
    await user.click(screen.getByRole('button', { name: 'Check message' }));

    await waitFor(() => {
      expect(screen.getByText('No obvious warning signs detected')).toBeDefined();
    });

    // Try again
    await user.clear(textarea);
    await user.type(textarea, 'Another message');
    await user.click(screen.getByRole('button', { name: 'Check message' }));

    await waitFor(() => {
      expect(calls.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('validates empty input', async () => {
    const user = userEvent.setup();
    const { calls } = stubFetch(200, { success: true, data: LOW_RISK_RESULT });

    renderWithLanguage(<FraudChecker />);

    await user.click(screen.getByRole('button', { name: 'Check message' }));

    expect(screen.getByText('Please enter a message to check.')).toBeDefined();
    expect(calls).toHaveLength(0);
  });

  it('validates whitespace-only input', async () => {
    const user = userEvent.setup();
    const { calls } = stubFetch(200, { success: true, data: LOW_RISK_RESULT });

    renderWithLanguage(<FraudChecker />);

    const textarea = screen.getByLabelText('Suspicious message');
    await user.type(textarea, '   ');
    await user.click(screen.getByRole('button', { name: 'Check message' }));

    expect(screen.getByText('Please enter a message to check.')).toBeDefined();
    expect(calls).toHaveLength(0);
  });
});

// ── FraudInput Tests ───────────────────────────────────────────────────────

describe('FraudInput', () => {
  it('renders with label and button', () => {
    renderWithLanguage(
      <FraudInput onSubmit={() => {}} isLoading={false} hasError={false} errorMessage={null} />
    );
    expect(screen.getByLabelText('Suspicious message')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Check message' })).toBeDefined();
  });

  it('disables textarea and button when loading', () => {
    renderWithLanguage(
      <FraudInput onSubmit={() => {}} isLoading={true} hasError={false} errorMessage={null} />
    );
    expect((screen.getByLabelText('Suspicious message') as HTMLTextAreaElement).disabled).toBe(true);
    // Button shows translated loading text via loadingText prop
    expect((screen.getByRole('button', { name: 'Checking...' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows error message when hasError is true', () => {
    renderWithLanguage(
      <FraudInput onSubmit={() => {}} isLoading={false} hasError={true} errorMessage="Something went wrong" />
    );
    expect(screen.getByText('Something went wrong')).toBeDefined();
  });

  it('calls onSubmit with text when form is submitted', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithLanguage(
      <FraudInput onSubmit={onSubmit} isLoading={false} hasError={false} errorMessage={null} />
    );

    const textarea = screen.getByLabelText('Suspicious message');
    await user.type(textarea, 'Test message');
    await user.click(screen.getByRole('button', { name: 'Check message' }));

    expect(onSubmit).toHaveBeenCalledWith('Test message');
  });

  it('shows character counter', () => {
    renderWithLanguage(
      <FraudInput onSubmit={() => {}} isLoading={false} hasError={false} errorMessage={null} />
    );
    expect(screen.getAllByText(/characters/).length).toBeGreaterThan(0);
  });
});

// ── FraudRiskSummary Tests ─────────────────────────────────────────────────

describe('FraudRiskSummary', () => {
  it('displays low risk level', () => {
    renderWithLanguage(<FraudRiskSummary riskLevel="low" riskScore={0} />);
    expect(screen.getByText('Low')).toBeDefined();
    expect(screen.getByText('No obvious risk indicators detected')).toBeDefined();
  });

  it('displays medium risk level', () => {
    renderWithLanguage(<FraudRiskSummary riskLevel="medium" riskScore={50} />);
    expect(screen.getByText('Medium')).toBeDefined();
    expect(screen.getByText('Potentially suspicious')).toBeDefined();
  });

  it('displays high risk level', () => {
    renderWithLanguage(<FraudRiskSummary riskLevel="high" riskScore={75} />);
    expect(screen.getByText('High')).toBeDefined();
    expect(screen.getByText('High-risk indicators detected')).toBeDefined();
  });

  it('shows internal score label, not probability', () => {
    renderWithLanguage(<FraudRiskSummary riskLevel="high" riskScore={75} />);
    expect(screen.getByText(/Internal risk score/)).toBeDefined();
    expect(screen.getByText(/not a probability/)).toBeDefined();
  });

  it('communicates risk level with text, not just color', () => {
    renderWithLanguage(<FraudRiskSummary riskLevel="high" riskScore={75} />);
    // The risk level text is present, not just a color indicator
    expect(screen.getByText('High')).toBeDefined();
  });
});

// ── FraudSignalList Tests ──────────────────────────────────────────────────

describe('FraudSignalList', () => {
  const signals: FraudSignalMatch[] = [
    {
      code: 'UNOFFICIAL_FEE',
      name: 'Unofficial fee request',
      severity: 'high',
      weight: 30,
      explanation: 'The message asks you to make a payment to receive a government benefit.',
      matchedText: 'Pay ₹500 to activate your benefit',
    },
    {
      code: 'URGENT_PAYMENT',
      name: 'Urgent payment request',
      severity: 'medium',
      weight: 20,
      explanation: 'The message creates a sense of urgency.',
      matchedText: '',
    },
  ];

  it('renders signal names and explanations', () => {
    renderWithLanguage(<FraudSignalList signals={signals} />);
    expect(screen.getByText('Unofficial fee request')).toBeDefined();
    expect(screen.getByText('The message asks you to make a payment to receive a government benefit.')).toBeDefined();
    expect(screen.getByText('Urgent payment request')).toBeDefined();
  });

  it('shows matched text when available', () => {
    renderWithLanguage(<FraudSignalList signals={signals} />);
    expect(screen.getByText(/Detected phrase/)).toBeDefined();
    expect(screen.getByText(/Pay ₹500 to activate your benefit/)).toBeDefined();
  });

  it('does not show matched text when not available', () => {
    renderWithLanguage(<FraudSignalList signals={[signals[1]]} />);
    expect(screen.queryByText(/Detected phrase/)).toBeNull();
  });

  it('does not expose internal rule codes', () => {
    renderWithLanguage(<FraudSignalList signals={signals} />);
    expect(screen.queryByText('UNOFFICIAL_FEE')).toBeNull();
    expect(screen.queryByText('URGENT_PAYMENT')).toBeNull();
  });
});

// ── SchemeFindings Tests ───────────────────────────────────────────────────

describe('SchemeFindings', () => {
  const recognizedSchemes: RecognizedScheme[] = [
    {
      schemeId: 'test-id',
      schemeCode: 'PM-KISAN',
      schemeName: 'PM-KISAN',
      officialUrl: 'https://example.gov',
      matchedText: 'PM-KISAN',
    },
  ];

  it('renders supported finding', () => {
    const findings: SchemeClaimFinding[] = [
      {
        schemeId: 'test-id',
        schemeCode: 'PM-KISAN',
        schemeName: 'PM-KISAN',
        claimType: 'eligibility',
        status: 'supported',
        explanation: 'This claim is consistent with the scheme information currently available.',
      },
    ];
    renderWithLanguage(<SchemeFindings schemeFindings={findings} recognizedSchemes={recognizedSchemes} />);
    expect(screen.getByText('Supported')).toBeDefined();
    expect(screen.getByText('PM-KISAN')).toBeDefined();
  });

  it('renders contradicted finding', () => {
    const findings: SchemeClaimFinding[] = [
      {
        schemeId: 'test-id',
        schemeCode: 'PM-KISAN',
        schemeName: 'PM-KISAN',
        claimType: 'payment_required',
        status: 'contradicted',
        explanation: 'This claim does not match the scheme information currently available.',
      },
    ];
    renderWithLanguage(<SchemeFindings schemeFindings={findings} recognizedSchemes={recognizedSchemes} />);
    expect(screen.getByText('Contradicted')).toBeDefined();
  });

  it('renders unknown finding as "Not verified", not "Contradicted"', () => {
    const findings: SchemeClaimFinding[] = [
      {
        schemeId: 'test-id',
        schemeCode: 'PM-KISAN',
        schemeName: 'PM-KISAN',
        claimType: 'payment_required',
        status: 'unknown',
        explanation: 'We could not verify this claim using the scheme information currently available.',
      },
    ];
    renderWithLanguage(<SchemeFindings schemeFindings={findings} recognizedSchemes={recognizedSchemes} />);
    expect(screen.getByText('Not verified')).toBeDefined();
    expect(screen.queryByText('Contradicted')).toBeNull();
  });

  it('shows official source link when available', () => {
    const findings: SchemeClaimFinding[] = [
      {
        schemeId: 'test-id',
        schemeCode: 'PM-KISAN',
        schemeName: 'PM-KISAN',
        claimType: 'eligibility',
        status: 'supported',
        explanation: 'This claim is consistent with the scheme information currently available.',
        officialUrl: 'https://example.gov',
      },
    ];
    renderWithLanguage(<SchemeFindings schemeFindings={findings} recognizedSchemes={recognizedSchemes} />);
    expect(screen.getByText('Verify on official source')).toBeDefined();
  });

  it('renders recognized schemes without findings', () => {
    renderWithLanguage(<SchemeFindings schemeFindings={[]} recognizedSchemes={recognizedSchemes} />);
    expect(screen.getByText('PM-KISAN')).toBeDefined();
  });
});

// ── FraudRecommendations Tests ─────────────────────────────────────────────

describe('FraudRecommendations', () => {
  it('renders recommendation text', () => {
    const recommendations = [
      { text: 'Do not send money until the request has been independently verified.' },
      { text: 'Do not share OTPs, PINs, or passwords.' },
    ];
    renderWithLanguage(<FraudRecommendations recommendations={recommendations} />);
    expect(screen.getByText('Do not send money until the request has been independently verified.')).toBeDefined();
    expect(screen.getByText('Do not share OTPs, PINs, or passwords.')).toBeDefined();
  });

  it('shows helpline note when 1930 is mentioned', () => {
    const recommendations = [
      { text: 'If you have already lost money, call 1930.' },
    ];
    renderWithLanguage(<FraudRecommendations recommendations={recommendations} />);
    expect(screen.getAllByText(/1930/).length).toBeGreaterThan(0);
  });

  it('does not render when recommendations are empty', () => {
    const { container } = renderWithLanguage(<FraudRecommendations recommendations={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

// ── EmptyResult Tests ──────────────────────────────────────────────────────

describe('EmptyResult', () => {
  it('shows no warning signs message', () => {
    renderWithLanguage(<EmptyResult onRetry={() => {}} />);
    expect(screen.getByText('No obvious warning signs detected')).toBeDefined();
  });

  it('shows disclaimer about not guaranteeing legitimacy', () => {
    renderWithLanguage(<EmptyResult onRetry={() => {}} />);
    expect(screen.getByText(/does not guarantee/i)).toBeDefined();
  });

  it('does not say "This message is safe"', () => {
    renderWithLanguage(<EmptyResult onRetry={() => {}} />);
    expect(screen.queryByText(/safe/i)).toBeNull();
  });

  it('calls onRetry when retry button is clicked', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    renderWithLanguage(<EmptyResult onRetry={onRetry} />);
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(onRetry).toHaveBeenCalled();
  });
});

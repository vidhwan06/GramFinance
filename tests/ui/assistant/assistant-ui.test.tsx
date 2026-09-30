// @vitest-environment jsdom
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { restoreFetch, stubFetch } from '../schemes/render-helper';
import AssistantPage from '@/app/(main)/assistant/page';

// Use vi.hoisted so the mock is available when the factory runs
const { mockUseLanguage } = vi.hoisted(() => ({
  mockUseLanguage: vi.fn(),
}));

vi.mock('@/features/language/hooks/useLanguage', () => ({
  useLanguage: () => mockUseLanguage(),
}));

const EN_T = {
  nav: { assistant: 'AI Assistant' },
  assistant: {
    title: 'AI Assistant',
    subtitle: 'Ask financial questions in plain language.',
    inputPlaceholder: 'Type your question here...',
    send: 'Send',
    loading: 'Thinking...',
    error: 'Sorry, I could not respond. Please try again.',
    emptyTitle: 'Ask GramFinance',
    emptyMessage: 'Explain financial concepts, guide you to the right tool, and answer general financial-literacy questions.',
    disclaimer: 'This assistant is informational and not an authority. It does not determine eligibility, classify fraud, or provide official government guidance.',
    eligibilityDeferral: 'Check Scheme Eligibility',
    fraudDeferral: 'Check a Message',
    loanDeferral: 'Open Loan Calculator',
  },
};

const KN_T = {
  nav: { assistant: 'ಸಹಾಯಕಿ (AI)' },
  assistant: {
    title: 'ಸಹಾಯಕ (AI)',
    subtitle: 'ಹಣಕಾಸು ಪ್ರಶ್ನೆಗಳನ್ನು ಸರಳ ಭಾಷೆಯಲ್ಲಿ ಕೇಳಿ.',
    inputPlaceholder: 'ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...',
    send: 'ಕಳುಹಿಸಿ',
    loading: 'ಯೋಚಿಸುತ್ತಿದೆ...',
    error: 'ಕ್ಷಮಿಸಿ, ನಾನು ಉತ್ತರಿಸಲು ಸಾಧ್ಯವಾಗಲಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
    emptyTitle: 'ಗ್ರಾಮ್‌ಫೈನಾನ್ಸ್‌ಗೆ ಕೇಳಿ',
    emptyMessage: 'ಹಣಕಾಸು ಪರಿಕಲ್ಪನೆಗಳನ್ನು ವಿವರಿಸಿ, ಸರಿಯಾದ ಪರಿಕರಕ್ಕೆ ಮಾರ್ಗದರ್ಶನ ನೀಡಿ ಮತ್ತು ಸಾಮಾನ್ಯ ಹಣಕಾಸು ಸಾಕ್ಷರತೆ ಪ್ರಶ್ನೆಗಳಿಗೆ ಉತ್ತರಿಸಿ.',
    disclaimer: 'ಈ ಸಹಾಯಕ ಮಾಹಿತಿಗಾಗಿ ಮಾತ್ರ ಮತ್ತು ಅಧಿಕಾರವಲ್ಲ. ಇದು ಅರ್ಹತೆ ನಿರ್ಧರಿಸುವುದಿಲ್ಲ, ವಂಚನೆ ವರ್ಗೀಕರಿಸುವುದಿಲ್ಲ ಅಥವಾ ಅಧಿಕೃತ ಸರ್ಕಾರಿ ಮಾರ್ಗದರ್ಶನ ನೀಡುವುದಿಲ್ಲ.',
    eligibilityDeferral: 'ಯೋಜನೆ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ',
    fraudDeferral: 'ಸಂದೇಶ ಪರೀಕ್ಷಿಸಿ',
    loanDeferral: 'ಸಾಲದ ಲೆಕ್ಕಾಚಾರ ತೆರೆಯಿರಿ',
  },
};

beforeEach(() => {
  localStorage.clear();
  mockUseLanguage.mockReturnValue({ t: EN_T, language: 'en', setLanguage: vi.fn() });
  // jsdom does not implement scrollIntoView
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  restoreFetch();
  vi.restoreAllMocks();
  localStorage.clear();
});

function stubAssistantResponse(reply: string, deferral: unknown = null) {
  stubFetch(200, { success: true, data: { reply, deferral } });
}

describe('AssistantPage', () => {
  it('renders empty state initially', () => {
    stubAssistantResponse('hi');
    render(<AssistantPage />);
    expect(screen.getByText('Ask GramFinance')).toBeDefined();
    expect(screen.getByText(/Explain financial concepts/)).toBeDefined();
  });

  it('shows disclaimer', () => {
    stubAssistantResponse('hi');
    render(<AssistantPage />);
    expect(screen.getByText(/informational and not an authority/)).toBeDefined();
  });

  it('sends a message and shows assistant response', async () => {
    stubAssistantResponse('EMI is Equated Monthly Installment.');

    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'What is EMI?');
    await userEvent.click(screen.getByLabelText('Send'));

    expect(await screen.findByText('What is EMI?')).toBeDefined();
    expect(await screen.findByText('EMI is Equated Monthly Installment.')).toBeDefined();
  });

  it('shows loading state while waiting', async () => {
    (globalThis as { fetch: unknown }).fetch = vi.fn().mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          setTimeout(() => {
            resolve({
              ok: true,
              status: 200,
              json: async () => ({ success: true, data: { reply: 'Hi there!', deferral: null } }),
            } as Response);
          }, 100);
        })
    );

    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'Hello');
    await userEvent.click(screen.getByLabelText('Send'));

    expect(await screen.findByText('Thinking...')).toBeDefined();
    expect(await screen.findByText('Hi there!', {}, { timeout: 2000 })).toBeDefined();
  });

  it('shows error state on API failure', async () => {
    stubFetch(500, { success: false, error: { message: 'Server error' } });

    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'Hello');
    await userEvent.click(screen.getByLabelText('Send'));

    expect(await screen.findByText('Sorry, I could not respond. Please try again.')).toBeDefined();
  });

  it('disables send button when input is empty', () => {
    stubAssistantResponse('hi');
    render(<AssistantPage />);
    const sendButton = screen.getByLabelText('Send');
    expect((sendButton as HTMLButtonElement).disabled).toBe(true);
  });

  it('renders Kannada translations', () => {
    mockUseLanguage.mockReturnValue({ t: KN_T, language: 'kn', setLanguage: vi.fn() });
    stubAssistantResponse('hi');
    render(<AssistantPage />);
    expect(screen.getByText('ಸಹಾಯಕ (AI)')).toBeDefined();
    expect(screen.getByPlaceholderText('ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...')).toBeDefined();
  });

  it('renders Markdown bold text', async () => {
    stubAssistantResponse('**bold text**');
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'test');
    await userEvent.click(screen.getByLabelText('Send'));
    expect(await screen.findByText('bold text')).toBeDefined();
    const strong = document.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('bold text');
  });

  it('renders Markdown headings', async () => {
    stubAssistantResponse('## Heading 2');
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'test');
    await userEvent.click(screen.getByLabelText('Send'));
    expect(await screen.findByText('Heading 2')).toBeDefined();
    const h2 = document.querySelector('h2');
    expect(h2).not.toBeNull();
  });

  it('renders Markdown bullet lists', async () => {
    stubAssistantResponse('- item 1\n- item 2');
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'test');
    await userEvent.click(screen.getByLabelText('Send'));
    expect(await screen.findByText('item 1')).toBeDefined();
    const ul = document.querySelector('ul');
    expect(ul).not.toBeNull();
    const items = ul?.querySelectorAll('li');
    expect(items?.length).toBe(2);
  });

  it('renders Markdown numbered lists', async () => {
    stubAssistantResponse('1. first\n2. second');
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'test');
    await userEvent.click(screen.getByLabelText('Send'));
    expect(await screen.findByText('first')).toBeDefined();
    const ol = document.querySelector('ol');
    expect(ol).not.toBeNull();
  });

  it('renders Markdown inline code', async () => {
    stubAssistantResponse('Use `EMI` to calculate');
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'test');
    await userEvent.click(screen.getByLabelText('Send'));
    expect(await screen.findByText('EMI')).toBeDefined();
    const code = document.querySelector('code');
    expect(code).not.toBeNull();
  });

  it('does not render raw Markdown syntax', async () => {
    stubAssistantResponse('**bold** and _italic_');
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'test');
    await userEvent.click(screen.getByLabelText('Send'));
    // The raw asterisks should not be visible as text
    const strong = document.querySelector('strong');
    expect(strong).not.toBeNull();
    expect(strong?.textContent).toBe('bold');
    expect(strong?.parentElement?.textContent).not.toContain('**');
  });

  it('renders eligibility deferral link', async () => {
    stubAssistantResponse('You may qualify for PM-KISAN.', {
      type: 'eligibility',
      href: '/schemes',
    });
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'Am I eligible?');
    await userEvent.click(screen.getByLabelText('Send'));
    const link = await screen.findByText('Check Scheme Eligibility');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/schemes');
  });

  it('renders fraud deferral link', async () => {
    stubAssistantResponse('This could be a scam.', {
      type: 'fraud',
      href: '/check',
    });
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'Is this fraud?');
    await userEvent.click(screen.getByLabelText('Send'));
    const link = await screen.findByText('Check a Message');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/check');
  });

  it('renders loan deferral link', async () => {
    stubAssistantResponse('Your EMI depends on the loan amount.', {
      type: 'loan',
      href: '/loan',
    });
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'Calculate my EMI');
    await userEvent.click(screen.getByLabelText('Send'));
    const link = await screen.findByText('Open Loan Calculator');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/loan');
  });

  it('does not render deferral UI when no deferral is returned', async () => {
    stubAssistantResponse('EMI is Equated Monthly Installment.', null);
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('Type your question here...');
    await userEvent.type(input, 'What is EMI?');
    await userEvent.click(screen.getByLabelText('Send'));
    await screen.findByText('EMI is Equated Monthly Installment.');
    expect(screen.queryByText('Check Scheme Eligibility')).toBeNull();
    expect(screen.queryByText('Check a Message')).toBeNull();
    expect(screen.queryByText('Open Loan Calculator')).toBeNull();
  });

  it('renders Kannada deferral link', async () => {
    mockUseLanguage.mockReturnValue({ t: KN_T, language: 'kn', setLanguage: vi.fn() });
    stubAssistantResponse('ನೀವು PM-KISAN ಗೆ ಅರ್ಹರಿದ್ದೀರಿ.', {
      type: 'eligibility',
      href: '/schemes',
    });
    render(<AssistantPage />);
    const input = screen.getByPlaceholderText('ನಿಮ್ಮ ಪ್ರಶ್ನೆಯನ್ನು ಇಲ್ಲಿ ಟೈಪ್ ಮಾಡಿ...');
    await userEvent.type(input, 'ನಾನು ಅರ್ಹರೇ?');
    await userEvent.click(screen.getByLabelText('ಕಳುಹಿಸಿ'));
    const link = await screen.findByText('ಯೋಜನೆ ಅರ್ಹತೆ ಪರಿಶೀಲಿಸಿ');
    expect(link).toBeDefined();
    expect(link.closest('a')?.getAttribute('href')).toBe('/schemes');
  });
});

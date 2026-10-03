// @vitest-environment jsdom
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '@testing-library/react';
import { LanguageProvider } from '@/features/language/hooks/useLanguage';
import { LessonReader } from '@/features/learning/components/LessonReader';
import { QuizSection } from '@/features/learning/components/QuizSection';
import { LessonNavigation } from '@/features/learning/components/LessonNavigation';
import type { ChapterNavigation, LessonDetail } from '@/features/learning/types';
import { en } from '@/features/language/translations/en';

/**
 * The redesigned lesson reader.
 *
 * Two things are worth guarding here, and they pull in opposite directions:
 *
 *   1. PRESENTATION. The takeaway is the first thing after the title, the flow
 *      is a numbered list rather than a monospace blob, sections carry real
 *      headings, and the navigation always says where you are.
 *   2. CONTENT PRESERVATION. This is the half that matters most and the half a
 *      visual test cannot see. A redesign that quietly drops the long
 *      explanation, or hides the scenario answer where it can no longer be
 *      found, has removed teaching material. So every test that hides something
 *      behind a control also asserts the text is still reachable.
 */

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  // The LanguageProvider hydrates from this key in an effect, so a Kannada test
  // that set it would silently switch every LATER test into Kannada too and
  // fail them with "unable to find English text". Clearing it is what keeps
  // these tests independent.
  localStorage.clear();
  delete (globalThis as { fetch?: unknown }).fetch;
});

function renderWithLanguage(ui: React.ReactElement) {
  return render(<LanguageProvider>{ui}</LanguageProvider>);
}

/**
 * Resolves the panel a disclosure control points at, failing loudly if the
 * control is missing its `aria-controls` — a disclosure without one is not
 * wired up, and `getElementById(null)` would throw a confusing null error.
 */
function panelOf(control: HTMLElement): HTMLElement {
  const id = control.getAttribute('aria-controls');
  if (!id) throw new Error('disclosure control has no aria-controls');
  const panel = document.getElementById(id);
  if (!panel) throw new Error(`no element with id ${id}`);
  return panel;
}

/** Every checkbox in a container, typed as the inputs they are. */
function checkboxesIn(container: HTMLElement): HTMLInputElement[] {
  return within(container).getAllByRole('checkbox') as HTMLInputElement[];
}

/**
 * A lesson shaped like the real API response, including the fields that are
 * long blobs in production (`explanation` runs to thousands of characters).
 */
const LESSON: LessonDetail = {
  id: '10000000-0000-4000-8000-000000000022',
  category: 'digital-payments',
  difficulty: 'beginner',
  status: 'active',
  title_en: 'How UPI Payments Work',
  title_kn: 'UPI ಪಾವತಿ ಹೇಗೆ ಕೆಲಸ ಮಾಡುತ್ದದೆ',
  sort_order: 2,
  updated_at: '2026-01-01T00:00:00.000Z',
  content_en: {
    concept:
      'UPI stands for Unified Payments Interface. It connects a bank account to a payment application so money can move between accounts.',
    whyItMatters:
      'UPI is one of the most common ways money moves between people. Because the flow is quick and familiar, it is also easy to approve without reading.',
    explanation:
      'Start with the address. A UPI ID is like a mailbox name for your bank account. The second distinction is between sending and receiving. When somebody pays you, you do not enter a UPI PIN for it at all. Read first, then type the PIN, every single time.',
    steps: [
      'Open the trusted UPI or banking application.',
      'Choose the payment option that matches what you are doing.',
      'Select or enter the intended recipient.',
      'Check the recipient name the application shows.',
    ],
    example:
      'Scenario 1: Nagesh runs a small hardware shop and a customer wants to pay Rs 2,300 by scanning a QR code. Decision: the customer reads the name shown before entering the amount. Reasoning: the printed QR code carries no visible name. Scenario 2: Pushpa sends Rs 800 to her daughter using an old saved contact. Decision: she calls her daughter to confirm the UPI ID first.',
    visual:
      'UPI PAYMENT: recipient UPI ID or scanned QR -> name shown on screen -> amount entered -> payer authorises with own UPI PIN -> transaction status shown. THE TWO SECRETS: UPI PIN authorises money going OUT and is never shared.',
    commonMistakes: [
      'Entering the UPI PIN to receive money, which is not how receiving works.',
      'Sharing the UPI PIN because a caller sounded official, when nobody official ever asks.',
    ],
    practicalTakeaway: [
      'I enter my UPI PIN to send money, I never enter it to receive money, and I never tell it to anyone.',
      'Before every authorisation, read the recipient name and the amount.',
    ],
    quickRecap: [
      'UPI connects bank accounts through payment applications.',
      'A UPI ID is an address you can share to be paid.',
      'Every payment ends in a status you can check.',
    ],
  },
  content_kn: {
    concept:
      'UPI ಎಂದರೆ Unified Payments Interface. ಇದು ಬ್ಯಾಂಕ್ ಖಾತೆಯನ್ನು ಪಾವತಿ ಅಪ್ಲಿಕೇಶನ್‌ಗೆ ಜೋಡಿಸುತ್ತದೆ.',
    whyItMatters:
      'UPI ಹಣ ವದಾಯದ ಒಂದು ಪ್ರಮುಖ ಮಾರ್ಗ. ಹಣಕಾಸು ತ್ವರಿತವಾಗಿರುವುದರಿಂದ ಓದದೆ ಅನುಮೋದಿಸುವುದು ಸುಲಭ.',
    explanation:
      'ಮೊದಲನೆಯದಾಗಿ ವಿಳಾಸ. UPI ID ಎಂದರೆ ನಿಮ್ಮ ಬ್ಯಾಂಕ್ ಖಾತೆಯ ಚಿಠಿದವಿನ ಹೆಸರು. ಕಳುಹಿಸುವುದು ಮತ್ತು ಪಡೆಯುವುದು ನಡುವೆ ಎರಡನೇ ವ್ಯತ್ಯಾಸ ಇದೆ. ಮೊದಲು ಓದಿ, ನಂತರ PIN ನಮೂದಿಸಿ.',
    steps: ['ವಿಶ್ವಾಸಾರ್ಹ UPI ಅಪ್ಲಿಕೇಶನ್ ತೆರೆಯಿರಿ.', 'ಪಾವತಿ ಆಯ್ಕೆ ಮಾಡಿ.'],
    example:
      'ಪರಿಸ್ಥಿತಿ 1: ನಾಗೇಶ ಒಂದು ಹಾರ್ಡ್‌ವೇರ್ ಅಂಗಡಿ ನಡೆಸುತ್ತಾರೆ. ತೀರ್ಮಾನ: ಹೆಸರು ಓದಿದ ನಂತರ ಮೊತ್ತ ನಮೂದಿಸಲಾಗುತ್ತದೆ. ಪರಿಸ್ಥಿತಿ 2: ಪುಷ್ಪಾ ಹಾಸ್ಟೆಲ್‌ಗೆ Rs 800 ಕಳುಹಿಸುತ್ತಾರೆ. ತೀರ್ಮಾನ: ಮೊದಲು ಫೋನ್ ಮಾಡಿ ಖಚಿತಪಡಿಸಿ.',
    visual:
      'UPI ಪಾವತಿ: ಸ್ವೀಕರಿಸುವವರ UPI ID → ಪದೆಯ ಮೇಲೆ ಹೆಸರು → ಮೊತ್ತ ನಮೂದಿಸಲಾಗುತ್ತದೆ → ಪಾವತಿದಾರ ಅನುಮತಿ ನೀಡುತ್ತಾರೆ. ಎರಡು ರಹಸ್ಯಗಳು: UPI PIN ಎಂದರೆ ಹಣಕ್ಕೆ ಬಿರುವುದು.',
    commonMistakes: [
      'ಹಣ ಸ್ವೀಕರಿಸಲು UPI PIN ನಮೂದಿಸುವುದು, ಇದು ಸ್ವೀಕರಿಸುವ ಕೆಲಸದ ರೀತಿ ಅಲ್ಲ.',
      'UPI PIN ಬಹಿರಡುವುದು, ಏಕೆಂದರೆ ಯಾರೂ ಅಧಿಕೃತರು ಕೇಳುವುದಿಲ್ಲ.',
    ],
    practicalTakeaway: [
      'ಹಣ ಕಳುಹಿಸಲು ನಾನು UPI PIN ನಮೂದಿಸುತ್ತೇನೆ, ಪಡೆಯಲು ಎಂದಿಗೂ ನಮೂದಿಸುವುದಿಲ್ಲ.',
      'ಪ್ರತಿ ಅನುಮೋದನೆಗೂ ಹೆಸರು ಮತ್ತು ಮೊತ್ತ ಓದಿ.',
    ],
    quickRecap: ['UPI ಬ್ಯಾಂಕ್ ಖಾತೆಗಳನ್ನು ಜೋಡಿಸುತ್ತದೆ.', 'UPI ID ಒಂದು ವಿಳಾಸ.'],
  },
  quiz: {
    id: '20000000-0000-4000-8000-000000000022',
    questions_en: [
      {
        id: '30000000-0000-4000-8000-000000000001',
        question: 'Someone calls and says you must enter your UPI PIN to receive a refund. What do you do?',
        options: [
          'Enter the PIN because the caller said so',
          'Refuse, and verify through your own application',
          'Ask the caller for their employee number',
        ],
      },
    ],
    questions_kn: [
      {
        id: '30000000-0000-4000-8000-000000000001',
        question: '�ರಸಪ್ರಶ್ನೆ ಪ್ರಶ್ನೆ?',
        options: ['ಆಯ್ಕೆ ೧', 'ಆಯ್ಕೆ ೨', 'ಆಯ್ಕೆ ೩'],
      },
    ],
  },
};

const NAVIGATION: ChapterNavigation = {
  prevChapterId: '10000000-0000-4000-8000-000000000021',
  nextChapterId: '10000000-0000-4000-8000-000000000023',
  currentIndex: 2,
  totalChapters: 5,
};

describe('lesson header', () => {
  it('shows category, difficulty and title', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    expect(screen.getByRole('heading', { level: 1, name: 'How UPI Payments Work' })).toBeDefined();
    expect(screen.getByText('Digital Payments & UPI')).toBeDefined();
    expect(screen.getByText('Beginner')).toBeDefined();
  });

  it('tells the learner where they are in the module', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    const progress = screen.getByRole('progressbar');
    expect(progress.getAttribute('aria-valuenow')).toBe('2');
    expect(progress.getAttribute('aria-valuemax')).toBe('5');
    expect(screen.getAllByText(/Chapter/).length).toBeGreaterThan(0);
  });

  it('renders without a navigation object', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} />);
    expect(screen.getByRole('heading', { level: 1 })).toBeDefined();
    expect(screen.queryByRole('progressbar')).toBeNull();
  });
});

describe('"one thing to remember" is the lead element', () => {
  it('renders the lesson own first takeaway, verbatim', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    expect(screen.getByText(en.learning.oneThingToRemember)).toBeDefined();
    // The hero and the full takeaway list both carry it — that repetition is
    // intentional reinforcement, so assert it appears rather than appears once.
    expect(screen.getAllByText(/I enter my UPI PIN to send money/).length).toBeGreaterThan(0);
  });

  it('appears before every other section heading', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    const takeaway = screen.getByText(en.learning.oneThingToRemember);
    const concept = screen.getByRole('heading', { name: en.learning.concept });
    // compareDocumentPosition: DOCUMENT_POSITION_FOLLOWING === 4
    expect(
      Boolean(takeaway.compareDocumentPosition(concept) & Node.DOCUMENT_POSITION_FOLLOWING)
    ).toBe(true);
  });

  it('is omitted when the lesson has no takeaway at all', () => {
    const lesson = { ...LESSON, content_en: { ...LESSON.content_en, practicalTakeaway: '' } };
    renderWithLanguage(<LessonReader lesson={lesson} />);
    expect(screen.queryByText(en.learning.oneThingToRemember)).toBeNull();
  });
});

describe('progressive disclosure never removes content', () => {
  it('shows a lead and hides the rest behind a labelled control', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);

    const controls = screen.getAllByRole('button', { name: en.learning.readMore });
    expect(controls.length).toBeGreaterThan(0);

    const control = controls[0];
    expect(control.getAttribute('aria-expanded')).toBe('false');
    expect(panelOf(control).hidden).toBe(true);

    await user.click(control);
    expect(control.getAttribute('aria-expanded')).toBe('true');
    expect(panelOf(control).hidden).toBe(false);
  });

  it('keeps the full explanation reachable after expanding', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);

    const controls = screen.getAllByRole('button', { name: en.learning.readMore });
    await user.click(controls[controls.length - 1]);

    // The sentence that was hidden is now on screen.
    expect(screen.getByText(/Read first, then type the PIN/)).toBeDefined();
  });

  it('omits the control entirely when there is nothing to hide', () => {
    const lesson = {
      ...LESSON,
      content_en: { ...LESSON.content_en, concept: 'One short sentence.' },
    };
    renderWithLanguage(<LessonReader lesson={lesson} />);
    expect(screen.getAllByRole('button', { name: en.learning.readMore })).toHaveLength(1);
  });
});

describe('the visual field becomes a flow', () => {
  it('renders the arrow chain as an ordered list of steps', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    const flow = document.getElementById('lesson-flow')!;
    const items = within(flow).getAllByRole('listitem');
    // Five arrow-separated steps, plus the key-point rows.
    expect(items.length).toBeGreaterThanOrEqual(5);
    expect(flow.textContent).toContain('recipient UPI ID or scanned QR');
    expect(flow.textContent).toContain('payer authorises with own UPI PIN');
  });

  it('no longer renders the arrow chain as one monospace paragraph', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    const flow = document.getElementById('lesson-flow')!;
    expect(flow.textContent).not.toContain('->');
  });

  it('keeps the extra labelled sentences from that field as key points', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    expect(screen.getByText(en.learning.keyPoints)).toBeDefined();
    expect(screen.getByText(/never shared/)).toBeDefined();
  });

  it('shows the flow in Kannada too, from the typographic arrow', () => {
    localStorage.setItem('gramfinance_lang', 'kn');
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    const flow = document.getElementById('lesson-flow')!;
    expect(flow.textContent).toContain('ಸ್ವೀಕರಿಸುವವರ UPI ID');
    expect(flow.textContent).not.toContain('→');
  });
});

describe('scenarios feel like scenarios', () => {
  it('separates the two scenarios into their own blocks', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    expect(screen.getByText(en.learning.scenarioLabel.replace('{n}', '1'))).toBeDefined();
    expect(screen.getByText(en.learning.scenarioLabel.replace('{n}', '2'))).toBeDefined();
  });

  it('shows the situation but holds the decision behind a reveal', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);

    const reveals = screen.getAllByRole('button', { name: en.learning.thinkAboutIt });
    expect(reveals).toHaveLength(2);
    expect(reveals[0].getAttribute('aria-expanded')).toBe('false');

    expect(panelOf(reveals[0]).hidden).toBe(true);

    await user.click(reveals[0]);
    expect(reveals[0].getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByText(/Decision: the customer reads the name/)).toBeDefined();
  });

  it('toggles back closed, so the answer is not stuck on screen', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    const reveal = screen.getAllByRole('button', { name: en.learning.thinkAboutIt })[0];
    await user.click(reveal);
    const hide = screen.getAllByRole('button', { name: en.learning.hideExplanation })[0];
    await user.click(hide);
    expect(hide.getAttribute('aria-expanded')).toBe('false');
  });
});

describe('mistakes, steps, takeaway and recap', () => {
  it('splits each mistake into a headline and an explanation', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    expect(screen.getByText('Entering the UPI PIN to receive money')).toBeDefined();
    expect(screen.getByText(/which is not how receiving works/)).toBeDefined();
  });

  it('numbers every step so it can be scanned', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    const steps = document.getElementById('lesson-steps')!;
    const items = within(steps).getAllByRole('listitem');
    expect(items).toHaveLength(4);
    expect(steps.textContent).toContain('01');
    expect(steps.textContent).toContain('04');
  });

  it('lists every practical takeaway, not only the hero one', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    const list = document.getElementById('lesson-takeaway')!;
    expect(within(list).getAllByRole('listitem')).toHaveLength(2);
    expect(list.textContent).toContain('Before every authorisation');
  });

  it('turns the recap into a self-check that counts progress', async () => {
    const user = userEvent.setup();
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);

    const recap = document.getElementById('lesson-recap')!;
    const boxes = checkboxesIn(recap);
    expect(boxes).toHaveLength(3);
    expect(boxes[0].checked).toBe(false);

    await user.click(boxes[0]);
    expect(boxes[0].checked).toBe(true);
    expect(
      screen.getByText(en.learning.recapProgress.replace('{done}', '1').replace('{total}', '3'))
    ).toBeDefined();
  });

  it('hides sections a lesson does not have rather than showing placeholders', () => {
    const lesson = {
      ...LESSON,
      content_en: { ...LESSON.content_en, whyItMatters: undefined, steps: [], quickRecap: undefined },
    };
    renderWithLanguage(<LessonReader lesson={lesson} navigation={NAVIGATION} />);
    expect(document.getElementById('lesson-why')).toBeNull();
    expect(document.getElementById('lesson-steps')).toBeNull();
    expect(document.getElementById('lesson-recap')).toBeNull();
  });
});

describe('accessibility contract', () => {
  it('has exactly one h1 and uses h2 for sections', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole('heading', { level: 2 }).length).toBeGreaterThan(4);
  });

  it('names each section through aria-labelledby', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    for (const id of ['lesson-concept', 'lesson-flow', 'lesson-mistakes', 'lesson-recap']) {
      const section = document.getElementById(id)!;
      const labelledBy = section.getAttribute('aria-labelledby');
      expect(labelledBy, id).toBeTruthy();
      expect(document.getElementById(labelledBy!), id).toBeTruthy();
    }
  });

  it('does not rely on colour alone for the danger sections', () => {
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    // The mistakes block is titled in text, and its icon is aria-hidden rather
    // than being the only carrier of meaning.
    expect(
      screen.getByRole('heading', { name: en.learning.commonMistakes })
    ).toBeDefined();
  });
});

describe('bilingual rendering', () => {
  it('renders Kannada content and Kannada UI together', () => {
    localStorage.setItem('gramfinance_lang', 'kn');
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    expect(screen.getByRole('heading', { level: 1, name: LESSON.title_kn })).toBeDefined();
    expect(screen.getByText('ಪರಿಸ್ಥಿತಿ 1')).toBeDefined();
  });

  it('leaves no English UI chrome behind in Kannada mode', () => {
    localStorage.setItem('gramfinance_lang', 'kn');
    renderWithLanguage(<LessonReader lesson={LESSON} navigation={NAVIGATION} />);
    expect(screen.queryByText('Core Concept')).toBeNull();
    expect(screen.queryByText('Read more')).toBeNull();
  });
});

describe('LessonNavigation', () => {
  it('links to both neighbours and states the position', () => {
    renderWithLanguage(<LessonNavigation navigation={NAVIGATION} />);
    const nav = screen.getByRole('navigation', { name: en.learning.lessonNavigationLabel });
    expect(within(nav).getByText(en.learning.prevChapter).closest('a')).toBeDefined();
    expect(within(nav).getByText(en.learning.nextChapter).closest('a')).toBeDefined();
    expect(nav.textContent).toContain('2');
    expect(nav.textContent).toContain('5');
  });

  it('says the module is finished when there is no next chapter', () => {
    renderWithLanguage(
      <LessonNavigation navigation={{ ...NAVIGATION, nextChapterId: null }} />
    );
    expect(screen.getByText(en.learning.moduleComplete)).toBeDefined();
    expect(screen.queryByText(en.learning.nextChapter)).toBeNull();
  });

  it('renders nothing at all without navigation data', () => {
    const { container } = renderWithLanguage(<LessonNavigation />);
    expect(container.innerHTML).toBe('');
  });
});

describe('QuizSection presentation', () => {
  it('frames the quiz as the end of the lesson', () => {
    renderWithLanguage(<QuizSection lesson={LESSON} />);
    expect(
      screen.getByRole('heading', { name: en.learning.quizConclusionTitle })
    ).toBeDefined();
  });

  it('renders one option button per option, as real buttons', () => {
    renderWithLanguage(<QuizSection lesson={LESSON} />);
    // Each option is a <button>, so it is reachable by name and by keyboard —
    // not a styled <div>. Asserted by name so the submit button is not counted.
    const options = [
      screen.getByRole('button', { name: /Enter the PIN because the caller said so/ }),
      screen.getByRole('button', { name: /Refuse, and verify/ }),
      screen.getByRole('button', { name: /Ask the caller for their employee number/ }),
    ];
    expect(options).toHaveLength(3);
    expect(screen.getByRole('button', { name: en.learning.submitQuiz })).toBeDefined();
  });

  it('shows the explanation only after a scored submission', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        success: true,
        data: {
          lessonId: LESSON.id,
          quizId: LESSON.quiz!.id,
          score: 1,
          totalQuestions: 1,
          percentage: 100,
          passed: true,
          answers: [
            {
              questionId: '30000000-0000-4000-8000-000000000001',
              question: 'q',
              options: ['a', 'b', 'c'],
              selectedIndex: 1,
              correctAnswerIndex: 1,
              isCorrect: true,
              explanation: 'Receiving money never requires a UPI PIN.',
            },
          ],
        },
      }),
    });
    (globalThis as { fetch: unknown }).fetch = fetchMock;

    renderWithLanguage(<QuizSection lesson={LESSON} />);
    expect(screen.queryByText(/Receiving money never requires/)).toBeNull();

    await user.click(screen.getByRole('button', { name: /Refuse, and verify/ }));
    await user.click(screen.getByRole('button', { name: en.learning.submitQuiz }));

    expect(screen.getByText(/Receiving money never requires/)).toBeDefined();
    expect(screen.getByText(en.learning.correct)).toBeDefined();
  });

  it('renders nothing when the lesson has no quiz', () => {
    const lesson = { ...LESSON, quiz: null };
    const { container } = renderWithLanguage(<QuizSection lesson={lesson} />);
    expect(container.innerHTML).toBe('');
  });
});
import { describe, it, expect } from 'vitest';
import {
  estimateReadingMinutes,
  heroTakeaway,
  parseFlow,
  parseScenarios,
  progressiveSplit,
  splitLabel,
  splitMistake,
  splitSentences,
  toLines,
  toParagraphs,
} from '@/features/learning/lesson-content';

/**
 * The lesson reader's text handling.
 *
 * These are all *splits*, never rewrites, so the invariant every test here is
 * really asserting is content preservation: whatever the learner could read
 * before the redesign, they can still read after. The specific traps are the
 * ones that would silently lose or mangle a sentence if they regressed —
 *
 *   1. Sentence splitting on decimal amounts ("Rs 1.5 lakh", "10.5%").
 *   2. The Kannada arrow glyph (`→`) versus the ASCII `->` the English text
 *      uses — the same lesson data uses BOTH, in both languages.
 *   3. The `|` alternation in one lesson's flow ("WITHDRAW | TRANSFER"), which
 *      looks like a separator but is two alternatives, not two steps.
 *   4. Text that appears BEFORE the first scenario marker, which a naive split
 *      would delete.
 */

/** A real `visual` field, arrow chain plus trailing labelled sentences. */
const UPI_VISUAL =
  'UPI PAYMENT: recipient UPI ID or scanned QR -> name shown on screen -> amount entered -> ' +
  'payment screen reviewed by payer -> payer authorises with own UPI PIN -> record kept. ' +
  'THE TWO SECRETS: UPI PIN authorises money going OUT and is never shared. ' +
  'BEFORE THE PIN: recipient name correct, amount correct, direction correct.';

/** The same field in Kannada, using the typographic arrow instead of `->`. */
const UPI_VISUAL_KN =
  'UPI ಪಾವತಿ: ಸ್ವೀಕರಿಸುವವರ UPI ID ಅಥವಾ ಸ್ಕ್ಯಾನ್ ಮಾಡಿದ QR → ಪದೆಯ ಮೇಲೆ ಹೆಸರು → ಮೊತ್ತ ನಮೂದಿಸಲಾಗುತ್ತದೆ → ಪಾವತಿದಾರ ಅನುಮತಿ ನೀಡುತ್ತಾರೆ → ದಾಖಲೆ ಇರುತ್ತದೆ. ' +
  'ಎರಡು ರಹಸ್ಯಗಳು: UPI PIN ಎಂದರೆ ಹಣಕ್ಕೆ ಬಿರುವುದು.';

describe('toLines', () => {
  it('accepts the array form the schema prefers', () => {
    expect(toLines(['one', 'two'])).toEqual(['one', 'two']);
  });

  it('accepts the string form the schema also allows', () => {
    expect(toLines('one')).toEqual(['one']);
  });

  it('drops empty and whitespace-only entries', () => {
    expect(toLines(['one', '', '   ', 'two'])).toEqual(['one', 'two']);
  });

  it('returns an empty list rather than throwing on missing data', () => {
    expect(toLines(undefined)).toEqual([]);
    expect(toLines(null)).toEqual([]);
    expect(toLines('')).toEqual([]);
  });
});

describe('splitSentences', () => {
  it('splits on a full stop', () => {
    expect(splitSentences('First one. Second one.')).toEqual(['First one.', 'Second one.']);
  });

  it('does NOT split on a colon, which introduces a labelled clause', () => {
    // Regression: "UPI PAYMENT: recipient ... -> ..." used to split in half,
    // stranding "UPI PAYMENT:" on its own and losing the label from the step.
    expect(splitSentences('BEFORE THE PIN: check the name, then the amount')).toEqual([
      'BEFORE THE PIN: check the name, then the amount',
    ]);
  });

  it('does not split a decimal amount into two sentences', () => {
    // The regression this guards: "Rs 1.5" must not become "Rs 1." + "5".
    expect(splitSentences('It costs Rs 1.5 lakh in total.')).toEqual([
      'It costs Rs 1.5 lakh in total.',
    ]);
  });

  it('does not split on a percentage', () => {
    expect(splitSentences('A rate of 10.5% per year applies.')).toEqual([
      'A rate of 10.5% per year applies.',
    ]);
  });

  it('splits Kannada text on the same punctuation', () => {
    expect(splitSentences('ಮೊದಲ ವಾಕ್ಯ. ಎರಡನೇ ವಾಕ್ಯ.')).toEqual(['ಮೊದಲ ವಾಕ್ಯ.', 'ಎರಡನೇ ವಾಕ್ಯ.']);
  });

  it('returns an empty list for empty input', () => {
    expect(splitSentences('   ')).toEqual([]);
  });
});

describe('toParagraphs', () => {
  it('groups sentences into short paragraphs', () => {
    expect(toParagraphs('One. Two. Three. Four.', 2)).toEqual(['One. Two.', 'Three. Four.']);
  });

  it('loses no sentence when the count is odd', () => {
    const text = 'One. Two. Three.';
    expect(toParagraphs(text, 2).join(' ')).toBe(splitSentences(text).join(' '));
  });

  it('preserves the full text verbatim', () => {
    const text =
      'A UPI payment has two sides. The payer sends and the payee receives. ' +
      'Money leaves only when the payer authorises it with a PIN.';
    expect(toParagraphs(text, 2).join(' ')).toBe(text);
  });
});

describe('progressiveSplit', () => {
  it('shows the lead and holds the rest back', () => {
    const { lead, rest } = progressiveSplit('One. Two. Three. Four.', 2);
    expect(lead).toBe('One. Two.');
    // The remainder is kept as individual sentences so each hidden chunk stays
    // short; `toParagraphs` regroups them if a caller wants pairs.
    expect(rest).toEqual(['Three.', 'Four.']);
  });

  it('holds nothing back when the text is already short', () => {
    const { lead, rest } = progressiveSplit('Only one sentence.', 2);
    expect(lead).toBe('Only one sentence.');
    expect(rest).toEqual([]);
  });

  it('is lossless', () => {
    const text = 'One. Two. Three. Four. Five.';
    const { lead, rest } = progressiveSplit(text, 1);
    expect([lead, ...rest].join(' ')).toBe(text);
  });

  it('handles empty input without throwing', () => {
    expect(progressiveSplit('')).toEqual({ lead: '', rest: [] });
  });
});

describe('splitLabel', () => {
  it('separates a short uppercase label from its body', () => {
    expect(splitLabel('BEFORE THE PIN: check the name, then the amount')).toEqual({
      label: 'BEFORE THE PIN',
      body: 'check the name, then the amount',
    });
  });

  it('leaves a sentence with no label intact', () => {
    expect(splitLabel('Just a plain sentence.')).toEqual({
      label: null,
      body: 'Just a plain sentence',
    });
  });

  it('does not treat a colon far into the sentence as a label', () => {
    const long = 'This sentence runs on for quite a while before arriving at: the point.';
    expect(splitLabel(long).label).toBeNull();
  });
});

describe('parseFlow', () => {
  it('turns the arrow chain into ordered steps', () => {
    const { steps } = parseFlow(UPI_VISUAL);
    expect(steps[0]).toBe('UPI PAYMENT: recipient UPI ID or scanned QR');
    expect(steps).toContain('payer authorises with own UPI PIN');
    expect(steps.every((step) => !step.includes('->'))).toBe(true);
  });

  it('keeps the trailing labelled sentences as key points', () => {
    const { keyPoints } = parseFlow(UPI_VISUAL);
    expect(keyPoints).toContainEqual({
      label: 'THE TWO SECRETS',
      body: 'UPI PIN authorises money going OUT and is never shared',
    });
  });

  it('is lossless: every word of the field survives the split', () => {
    const { steps, keyPoints } = parseFlow(UPI_VISUAL);
    const rebuilt = [steps.join(' '), ...keyPoints.map((p) => (p.label ? `${p.label}: ${p.body}` : p.body))]
      .join(' ')
      .replace(/\s+/g, ' ');
    for (const fragment of ['recipient UPI ID or scanned QR', 'BEFORE THE PIN', 'direction correct']) {
      expect(rebuilt).toContain(fragment);
    }
  });

  it('reads the Kannada typographic arrow exactly like the ASCII one', () => {
    // Both languages store the same kind of chain; only the arrow glyph differs.
    // `→` (U+2192) is what the Kannada content uses, `->` the English.
    const kn = parseFlow(UPI_VISUAL_KN);
    expect(kn.steps).toHaveLength(5);
    expect(kn.steps.every((step) => !step.includes('→'))).toBe(true);
    expect(kn.steps[0]).toContain('UPI ID');
  });

  it('parses both arrow styles into the same number of steps', () => {
    const ascii = parseFlow('A -> B -> C.');
    const unicode = parseFlow('A → B → C.');
    expect(ascii.steps).toEqual(unicode.steps);
    expect(ascii.steps).toEqual(['A', 'B', 'C']);
  });

  it('does NOT split on the pipe used for alternatives', () => {
    // "WITHDRAW | TRANSFER" is two options for one step, not two steps.
    const { steps } = parseFlow(
      'CASH DEPOSIT → BANK ACCOUNT → ACCOUNT BALANCE → WITHDRAW | TRANSFER'
    );
    expect(steps).toHaveLength(4);
    expect(steps[3]).toBe('WITHDRAW | TRANSFER');
  });

  it('returns the whole field as key points when there is no arrow at all', () => {
    // A defensive path: if a lesson is ever authored without a chain, the text
    // must still be shown rather than silently rendering an empty section.
    const { steps, keyPoints } = parseFlow('Only a sentence. And another one.');
    expect(steps).toEqual([]);
    expect(keyPoints).toHaveLength(2);
    expect(keyPoints[0].body).toBe('Only a sentence');
  });

  it('handles empty input without throwing', () => {
    expect(parseFlow('')).toEqual({ steps: [], keyPoints: [] });
  });
});

describe('splitMistake', () => {
  it('splits "what goes wrong, why it matters"', () => {
    expect(
      splitMistake(
        'Entering the UPI PIN to receive money, which is not how receiving works.'
      )
    ).toEqual({
      headline: 'Entering the UPI PIN to receive money',
      detail: 'which is not how receiving works',
    });
  });

  it('splits a two-sentence mistake at the sentence break', () => {
    const { headline, detail } = splitMistake(
      'Treating saving as whatever is left. There is usually nothing left.'
    );
    expect(headline).toBe('Treating saving as whatever is left');
    expect(detail).toBe('There is usually nothing left');
  });

  it('leaves a short mistake whole rather than producing a stub headline', () => {
    expect(splitMistake('Short one.')).toEqual({ headline: 'Short one.', detail: null });
  });

  it('is lossless apart from trailing punctuation', () => {
    const text =
      'Approving a payment without reading the receiver name on the screen, ' +
      'which is the most common way money reaches the wrong account.';
    const { headline, detail } = splitMistake(text);
    // The only permitted difference is the sentence-final full stop, which the
    // card layout does not need. No word may go missing.
    expect(`${headline}, ${detail}`.replace(/\s+/g, ' ')).toBe(text.replace(/\.$/, ''));
  });
});

describe('parseScenarios', () => {
  const example =
    'Scenario 1: A person receives a payment request. Decision: they refuse. ' +
    'Reasoning: receiving money needs no PIN. ' +
    'Scenario 2: Another person is called about a refund. Decision: they end the call. ' +
    'Reasoning: nobody real asks for a code.';

  it('splits the scenarios apart', () => {
    const scenarios = parseScenarios(example, 'Scenario');
    expect(scenarios).toHaveLength(2);
    expect(scenarios[0].number).toBe(1);
    expect(scenarios[1].number).toBe(2);
  });

  it('keeps only the situation as the visible opening', () => {
    const [first] = parseScenarios(example, 'Scenario');
    expect(first.opening).toBe('A person receives a payment request.');
    expect(first.opening).not.toContain('Decision:');
  });

  it('holds the decision and reasoning back as the rest', () => {
    const [first] = parseScenarios(example, 'Scenario');
    expect(first.rest.join(' ')).toContain('Decision: they refuse');
    expect(first.rest.join(' ')).toContain('Reasoning: receiving money needs no PIN');
  });

  it('never leaks one scenario into the next', () => {
    const [, second] = parseScenarios(example, 'Scenario');
    expect(second.opening).not.toContain('Scenario 1');
    expect(second.rest.join(' ')).not.toContain('Scenario 2');
  });

  it('splits Kannada scenarios using the Kannada marker', () => {
    const kn = parseScenarios(
      'ಪರಿಸ್ಥಿತಿ 1: ಒಬ್ಬ ವ್ಯಕ್ತಿ ಪಾವತಿ ಮನವಿ ಪಡೆಯುತ್ತಾನೆ. ತೀರ್ಮಾನ: ನಿರಾಕರಿಸುತ್ತಾನೆ. ' +
        'ಪರಿಸ್ಥಿತಿ 2: ಇನ್ನೊಬ್ಬರಿಗೆ ಕರೆ ಬರುತ್ತದೆ. ತೀರ್ಮಾನ: ಕರೆ ಕಡಿದುಹಾಕುತ್ತಾನೆ.',
      'ಪರಿಸ್ಥಿತಿ'
    );
    expect(kn).toHaveLength(2);
    expect(kn[0].number).toBe(1);
    expect(kn[1].opening).not.toContain('ಪರಿಸ್ಥಿತಿ 1');
  });

  it('does not use the English marker on Kannada text', () => {
    // Guards against a hardcoded English marker sneaking back in.
    const kn = parseScenarios('ಪರಿಸ್ಥಿತಿ 1: ಒಂದು ಪರಿಸ್ಥಿತಿ.', 'Scenario');
    expect(kn).toHaveLength(1);
  });

  it('keeps text written before the first marker', () => {
    const withPreamble = 'EXAMPLE ONLY: the amounts here are teaching figures. ' + example;
    const [first] = parseScenarios(withPreamble, 'Scenario');
    expect(first.opening).toContain('EXAMPLE ONLY');
  });

  it('returns the whole field as one scenario when no marker matches', () => {
    const plain = 'A single situation with no numbered marker at all.';
    const scenarios = parseScenarios(plain, 'Scenario');
    expect(scenarios).toHaveLength(1);
    expect(scenarios[0].opening).toBe(plain);
  });

  it('returns an empty list for empty input', () => {
    expect(parseScenarios('', 'Scenario')).toEqual([]);
  });
});

describe('heroTakeaway', () => {
  it('drops a short memory-instruction lead-in', () => {
    expect(
      heroTakeaway(
        'Keep one sentence in memory: I enter my UPI PIN to send money, never to receive it.'
      )
    ).toBe('I enter my UPI PIN to send money, never to receive it.');
  });

  it('drops the Kannada equivalent', () => {
    expect(
      heroTakeaway('ಒಂದು ವಾಕ್ಯ ನೆನಪಿಡಿ: ಹಣ ಕಳುಹಿಸಲು ನಾನು UPI PIN ನಮೂದಿಸುತ್ತೇನೆ.')
    ).toBe('ಹಣ ಕಳುಹಿಸಲು ನಾನು UPI PIN ನಮೂದಿಸುತ್ತೇನೆ.');
  });

  it('leaves a takeaway with no lead-in untouched', () => {
    const text = 'Check your balance at least once a month using your passbook.';
    expect(heroTakeaway(text)).toBe(text);
  });

  it('keeps a long lead-in, which is probably part of the rule itself', () => {
    const text =
      'Before every single authorisation you are about to make on any payment application ' +
      'at any time of the day: read the screen.';
    expect(heroTakeaway(text)).toBe(text);
  });

  it('does not drop text when there is nothing after the colon', () => {
    expect(heroTakeaway('Remember this exactly:')).toBe('Remember this exactly:');
  });

  it('handles empty input without throwing', () => {
    expect(heroTakeaway('')).toBe('');
  });
});

describe('estimateReadingMinutes', () => {
  it('never returns less than one minute', () => {
    expect(estimateReadingMinutes(['Short.'], 'en')).toBe(1);
  });

  it('grows with the amount of content', () => {
    const short = estimateReadingMinutes(['One two three.'], 'en');
    const long = estimateReadingMinutes([new Array(2000).fill('word').join(' ')], 'en');
    expect(long).toBeGreaterThan(short);
  });

  it('is capped so a huge lesson cannot claim an absurd duration', () => {
    expect(estimateReadingMinutes([new Array(200000).fill('word').join(' ')], 'en')).toBe(60);
  });

  it('measures Kannada by character, since it has no word spacing', () => {
    const kn = estimateReadingMinutes([new Array(2000).fill('ಕ').join('')], 'kn');
    expect(kn).toBeGreaterThan(1);
  });

  it('reports roughly the same duration for the same lesson in both languages', () => {
    // The content is a translation of itself, so the reading time must not
    // double when the learner switches to Kannada.
    const english = 'UPI stands for Unified Payments Interface. '.repeat(60);
    // The same passage in Kannada is roughly a third shorter per sentence.
    const kannada = 'UPI ಎಂದರೆ Unified Payments Interface. '.repeat(40);

    const en = estimateReadingMinutes([english], 'en');
    const kn = estimateReadingMinutes([kannada], 'kn');
    expect(Math.abs(en - kn)).toBeLessThanOrEqual(2);
  });

  it('skips missing fields without throwing', () => {
    expect(estimateReadingMinutes([undefined, 'Some text here.'], 'en')).toBeGreaterThan(0);
    expect(estimateReadingMinutes([undefined], 'en')).toBe(1);
  });
});
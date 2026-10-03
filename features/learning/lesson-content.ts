import type { Language } from '@/types/common';

/**
 * Presentation-only helpers for turning the existing lesson text fields into
 * the smaller shapes the redesigned reader renders.
 *
 * ── Hard rule: nothing here rewrites, summarises or drops content ───────────
 * Every function is a *split*. Whatever the learner could read before, they can
 * still read afterwards — either inline or behind a "Read more" control. That is
 * why these are pure functions with no language-specific copy of their own: they
 * operate on separators that already exist in the stored text.
 *
 * The stored fields are long, single-blob strings (`explanation` runs to ~4,300
 * characters). The learning problem is not that the content is wrong, it is that
 * the content arrives as one wall. These helpers let the UI show it in short
 * chunks without editing a single row in the database.
 */

/** `commonMistakes` / `practicalTakeaway` are `string[] | string` in the schema. */
export function toLines(value: string[] | string | undefined | null): string[] {
  if (Array.isArray(value)) return value.filter((line) => line.trim().length > 0);
  if (typeof value === 'string' && value.trim().length > 0) return [value];
  return [];
}

/**
 * Splits prose into sentences.
 *
 * Two details are load-bearing here:
 *
 *   * The `(?![0-9])` lookahead stops "Rs 1.5 lakh" and "10.5%" from being cut
 *     in half at the decimal point.
 *   * A colon is deliberately NOT treated as a sentence end. The lesson fields
 *     are full of `LABEL: body` pairs — "UPI PAYMENT:", "THE TWO SECRETS:",
 *     "Decision:" — and splitting on a colon tore every one of those labels off
 *     the text it introduces. A test pins this.
 *
 * Kannada uses the same sentence-final punctuation, so one rule covers both
 * languages and no language branch is needed.
 */
export function splitSentences(text: string): string[] {
  return text
    .trim()
    .split(/(?<=[.!?])\s+(?![0-9])/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

/** Groups sentences into short, readable paragraphs. Never loses a sentence. */
export function toParagraphs(text: string, maxSentences = 2): string[] {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return [];
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += maxSentences) {
    paragraphs.push(sentences.slice(i, i + maxSentences).join(' '));
  }
  return paragraphs;
}

/** The opening chunk shown by default, plus whatever stays behind "Read more". */
export function progressiveSplit(
  text: string,
  leadSentences = 2
): { lead: string; rest: string[] } {
  const sentences = splitSentences(text);
  if (sentences.length === 0) return { lead: '', rest: [] };
  const lead = sentences.slice(0, leadSentences).join(' ');
  const rest = sentences.slice(leadSentences);
  return { lead, rest };
}

/** Any flow step, note or scenario body reduced to one display line. */
function tidy(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[.\s]+$/, '').trim();
}

export type FlowStep = { label: string };
export type KeyPoint = { label: string | null; body: string };

export type ParsedFlow = {
  /** Ordered steps taken from the arrow chain, e.g. `a -> b -> c`. */
  steps: string[];
  /**
   * Everything else in the `visual` field. The field carries extra sentences
   * after the chain ("THE TWO SECRETS: ...", "BEFORE THE PIN: ..."), so these
   * are rendered as key points rather than dropped.
   */
  keyPoints: KeyPoint[];
};

/**
 * Turns the `visual` field into an ordered flow.
 *
 * The stored shape is a plain-text chain: `A -> B -> C`, or `A → B → C` in
 * Kannada, sometimes followed by further `.`-separated sentences. Only the
 * unambiguous arrow is treated as a sequence separator; the `|` alternation used
 * in a couple of lessons ("WITHDRAW | TRANSFER") is deliberately NOT a split,
 * because those are alternatives rather than steps.
 *
 * If a lesson ever ships a `visual` with no arrow at all, the whole field is
 * returned as key points so nothing disappears.
 */
export function parseFlow(visual: string): ParsedFlow {
  const normalised = visual.replace(/→/g, '->');
  const sentences = splitSentences(normalised);
  const chainIndex = sentences.findIndex((sentence) => sentence.includes('->'));

  if (chainIndex === -1) {
    return {
      steps: [],
      keyPoints: sentences.length > 0 ? sentences.map((body) => ({ label: null, body: tidy(body) })) : [],
    };
  }

  const steps = sentences[chainIndex]
    .split('->')
    .map(tidy)
    .filter((step) => step.length > 0);

  const keyPoints = sentences
    .filter((_, index) => index !== chainIndex)
    .map((sentence) => splitLabel(sentence))
    .filter((point) => point.body.length > 0);

  return { steps, keyPoints };
}

/**
 * Splits "BEFORE THE PIN: recipient name correct, amount correct" into its label
 * and body. Only a short, colon-terminated lead-in is treated as a label, so a
 * sentence that merely happens to contain a colon is left intact.
 */
export function splitLabel(sentence: string): KeyPoint {
  const colon = sentence.indexOf(':');
  if (colon > 0 && colon <= 40) {
    const label = tidy(sentence.slice(0, colon));
    const body = tidy(sentence.slice(colon + 1));
    if (label.length > 0 && body.length > 0) return { label, body };
  }
  return { label: null, body: tidy(sentence) };
}

export type ParsedScenario = {
  /** 1-based, taken from the "Scenario 2" marker in the stored text. */
  number: number;
  /** The situation itself — always shown. */
  opening: string;
  /** What the person decided, why, and what to do instead. Behind a reveal. */
  rest: string[];
};

/**
 * Splits the `example` field into its individual scenarios.
 *
 * The field is one blob: `Scenario 1: <story> Decision: ... Reasoning: ...
 * Possible problem: ... Better approach: ... Scenario 2: ...`. Splitting on the
 * numbered scenario marker keeps every word; it only stops three stories from
 * rendering as a single unreadable paragraph.
 *
 * `marker` is passed in from the translation layer ("Scenario" / "ಪರಿಸ್ಥಿತಿ")
 * so the reader never hardcodes an English word, and so a lesson authored in the
 * other language splits just as cleanly. If no marker is found the whole field
 * is returned as a single scenario rather than being dropped.
 */
export function parseScenarios(example: string, marker: string): ParsedScenario[] {
  const trimmed = example.trim();
  if (trimmed.length === 0) return [];

  const markerPattern = new RegExp(
    `${marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*(\\d+)\\s*[:\\u2014-]\\s*`,
    'giu'
  );

  const matches = [...trimmed.matchAll(markerPattern)];
  if (matches.length === 0) {
    return [{ number: 1, opening: trimmed, rest: [] }];
  }

  const preamble = trimmed.slice(0, matches[0].index).trim();

  const scenarios = matches.map((match, index) => {
    const bodyStart = (match.index ?? 0) + match[0].length;
    const bodyEnd =
      index + 1 < matches.length ? matches[index + 1].index ?? trimmed.length : trimmed.length;
    const body = trimmed.slice(bodyStart, bodyEnd).trim();

    // The situation is one sentence in every authored lesson ("Nagesh runs a
    // small hardware shop and a customer wants to pay Rs 2,300..."). Everything
    // after it is the answer — the decision, the reasoning, the better approach —
    // so the reveal starts immediately after the first sentence. Splitting on
    // the first sentence rather than on the "Decision:" label keeps this working
    // in Kannada without needing to know the translated label wording.
    const sentences = splitSentences(body);
    const opening = sentences[0] ?? body;
    const rest = toParagraphs(sentences.slice(1).join(' '), 2);

    return {
      number: Number(match[1]) || index + 1,
      opening,
      rest,
    };
  });

  // Text written before the first marker (some lessons add an EXAMPLE ONLY
  // note) stays attached to the opening scenario so it is not lost.
  if (preamble.length > 0 && scenarios.length > 0) {
    scenarios[0].opening = `${preamble}\n\n${scenarios[0].opening}`;
  }

  return scenarios;
}

/**
 * A mistake reads as "<what goes wrong>, <why it matters>" or as two sentences.
 * Splitting there gives the card a scannable heading and a quieter explanation
 * without editing the sentence.
 */
export function splitMistake(mistake: string): { headline: string; detail: string | null } {
  const text = mistake.trim();

  const comma = text.indexOf(',');
  const period = text.search(/\.\s/);
  const cut =
    comma >= 25 && (period === -1 || comma < period)
      ? comma
      : period >= 25
        ? period
        : -1;

  if (cut === -1) return { headline: text, detail: null };

  const headline = tidy(text.slice(0, cut));
  const detail = tidy(text.slice(cut + 1));
  if (headline.length < 12 || detail.length < 12) return { headline: text, detail: null };
  return { headline, detail };
}

/**
 * The one-line version of a takeaway, for the hero block at the top.
 *
 * Several lessons open their first takeaway with a memory instruction aimed at
 * the lesson itself — "Keep one sentence in memory: I enter my UPI PIN to send
 * money…". Under a heading that already reads "One thing to remember", that
 * instruction is redundant and pushes the actual rule off the first line.
 *
 * Only a short `LABEL: ` lead-in is dropped, and only for the hero: the full,
 * unmodified sentence still appears in the Practical Takeaway section further
 * down, so no wording is lost from the page. Long lead-ins are left alone
 * because at that length they are probably part of the rule rather than framing.
 */
export function heroTakeaway(takeaway: string): string {
  const text = takeaway.trim();
  const colon = text.indexOf(':');
  if (colon <= 0) return text;

  const lead = text.slice(0, colon);
  const body = text.slice(colon + 1).trim();
  const words = lead.trim().split(/\s+/).length;

  if (words <= 6 && lead.length <= 45 && body.length > 0) return body;
  return text;
}

/**
 * A reading-time estimate, used only as a "how long is this" cue.
 *
 * Derived from the lesson's own content, so it can never disagree with what is
 * actually on the page. Kannada is measured in characters rather than
 * space-separated words, because it has almost no word spacing: ~180 words per
 * minute in English against ~850 Kannada characters per minute, which are close
 * enough that the same lesson reports roughly the same duration in both
 * languages. A test pins that agreement — a learner switching language should
 * not see the lesson's length double.
 */
const WORDS_PER_MINUTE = 180;
const KANNADA_CHARS_PER_MINUTE = 850;

export function estimateReadingMinutes(parts: Array<string | undefined>, language: Language): number {
  const text = parts.filter((part): part is string => typeof part === 'string').join(' ');
  if (text.trim().length === 0) return 1;

  const minutes =
    language === 'kn'
      ? text.replace(/\s+/g, '').length / KANNADA_CHARS_PER_MINUTE
      : text.trim().split(/\s+/).length / WORDS_PER_MINUTE;

  return Math.min(60, Math.max(1, Math.round(minutes)));
}
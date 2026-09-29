import { describe, expect, it } from 'vitest';
import { feedbackInputSchema } from '@/features/feedback/validation';

describe('feedbackInputSchema', () => {
  const validInput = { module: 'loan', rating: 4, comment: 'Great tool!' };

  it('accepts valid feedback', () => {
    const result = feedbackInputSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('accepts feedback without a comment', () => {
    const result = feedbackInputSchema.safeParse({ module: 'loan', rating: 3 });
    expect(result.success).toBe(true);
  });

  it('rejects missing module', () => {
    const result = feedbackInputSchema.safeParse({ rating: 4 });
    expect(result.success).toBe(false);
  });

  it('rejects missing rating', () => {
    const result = feedbackInputSchema.safeParse({ module: 'loan' });
    expect(result.success).toBe(false);
  });

  it('rejects rating below 1', () => {
    const result = feedbackInputSchema.safeParse({ module: 'loan', rating: 0 });
    expect(result.success).toBe(false);
  });

  it('rejects rating above 5', () => {
    const result = feedbackInputSchema.safeParse({ module: 'loan', rating: 6 });
    expect(result.success).toBe(false);
  });

  it('rejects non-integer rating', () => {
    const result = feedbackInputSchema.safeParse({ module: 'loan', rating: 3.5 });
    expect(result.success).toBe(false);
  });

  it('rejects empty module', () => {
    const result = feedbackInputSchema.safeParse({ module: '', rating: 4 });
    expect(result.success).toBe(false);
  });

  it('rejects module over 50 characters', () => {
    const result = feedbackInputSchema.safeParse({
      module: 'a'.repeat(51),
      rating: 4,
    });
    expect(result.success).toBe(false);
  });

  it('rejects comment over 1000 characters', () => {
    const result = feedbackInputSchema.safeParse({
      module: 'loan',
      rating: 4,
      comment: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown fields', () => {
    const result = feedbackInputSchema.safeParse({
      ...validInput,
      user_id: 'malicious-uuid',
    });
    expect(result.success).toBe(false);
  });

  it('trims whitespace from module', () => {
    const result = feedbackInputSchema.safeParse({ module: '  loan  ', rating: 4 });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.module).toBe('loan');
    }
  });

  it('trims whitespace from comment', () => {
    const result = feedbackInputSchema.safeParse({
      module: 'loan',
      rating: 4,
      comment: '  helpful  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.comment).toBe('helpful');
    }
  });
});

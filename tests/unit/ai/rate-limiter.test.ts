import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isRateLimited, _resetBuckets } from '@/lib/ai/rate-limiter';

describe('rate limiter', () => {
  beforeEach(() => {
    _resetBuckets();
    // Use a small limit for testing
    process.env.ASSISTANT_RATE_LIMIT_MAX = '3';
    process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS = '60000';
  });

  afterEach(() => {
    delete process.env.ASSISTANT_RATE_LIMIT_MAX;
    delete process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS;
    vi.useRealTimers();
  });

  it('allows requests under the limit', () => {
    expect(isRateLimited('user-1')).toBe(false);
    expect(isRateLimited('user-1')).toBe(false);
    expect(isRateLimited('user-1')).toBe(false);
  });

  it('blocks requests over the limit', () => {
    isRateLimited('user-1');
    isRateLimited('user-1');
    isRateLimited('user-1');
    expect(isRateLimited('user-1')).toBe(true);
  });

  it('gives separate buckets to separate users', () => {
    isRateLimited('user-1');
    isRateLimited('user-1');
    isRateLimited('user-1');
    // user-2 should still be allowed
    expect(isRateLimited('user-2')).toBe(false);
  });

  it('resets after the window expires', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);

    isRateLimited('user-1');
    isRateLimited('user-1');
    isRateLimited('user-1');
    expect(isRateLimited('user-1')).toBe(true);

    // Advance past the window
    vi.setSystemTime(61_000);
    expect(isRateLimited('user-1')).toBe(false);
  });

  it('uses default limit when env var is not set', () => {
    delete process.env.ASSISTANT_RATE_LIMIT_MAX;
    delete process.env.ASSISTANT_RATE_LIMIT_WINDOW_MS;
    _resetBuckets();

    // Default is 10
    for (let i = 0; i < 10; i++) {
      expect(isRateLimited('user-1')).toBe(false);
    }
    expect(isRateLimited('user-1')).toBe(true);
  });
});

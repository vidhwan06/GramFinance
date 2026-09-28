import { describe, it, expect, vi } from 'vitest';
import { POST } from '@/app/api/fraud/check/route';

vi.mock('next/headers', () => ({
  cookies: async () => ({
    getAll: () => [],
    setAll: () => undefined,
  }),
}));

vi.mock('@/features/schemes/schemes-service', () => ({
  listActiveSchemes: vi.fn(),
}));

import { listActiveSchemes } from '@/features/schemes/schemes-service';
import type { SchemeStatus } from '@/features/schemes/types';

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/fraud/check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }) as unknown as Request;
}

const MOCK_SCHEMES = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    nameEn: 'PM-KISAN',
    nameKn: 'ಪಿେಂ ಕಿಸಾನ್',
    descriptionEn: 'Income support scheme for farmers.',
    descriptionKn: 'ಕಿಸಾನರಿಗೆ ಆದಾಯ ಬೆಂಬಲ ಯೋಜನೆ.',
    targetGroups: ['farmer'],
    states: ['ALL'],
    lastVerified: '2026-01-15',
    status: 'active' as SchemeStatus,
  },
];

/**
 * Security tests for Phase 2: scheme-aware fraud checking.
 *
 * Verifies that clients cannot inject scheme findings or risk results.
 */
describe('Fraud Check API Security — Phase 2', () => {
  it('rejects client-supplied schemeFindings with 400 (Zod strict mode)', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: 'normal text',
      schemeFindings: [{ status: 'contradicted' }],
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    // Zod .strict() rejects unknown properties entirely
    expect(response.status).toBe(400);
  });

  it('rejects client-supplied recognizedSchemes with 400 (Zod strict mode)', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: 'normal text',
      recognizedSchemes: [{ schemeName: 'PM-KISAN' }],
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('rejects client-supplied riskScore with 400 (Zod strict mode)', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: 'normal text',
      riskScore: 100,
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(400);
  });

  it('server resolves scheme data itself, not from client', async () => {
    const mockListActiveSchemes = vi.mocked(listActiveSchemes);
    mockListActiveSchemes.mockResolvedValue(MOCK_SCHEMES);

    const request = makeRequest({
      inputType: 'message',
      text: 'What is PM-KISAN?',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(200);

    const body = (await response.json()) as { success: boolean; data: { recognizedSchemes: { schemeName: string }[] } };
    // Server fetched schemes itself; client didn't supply them
    expect(mockListActiveSchemes).toHaveBeenCalled();
    expect(body.data.recognizedSchemes.length).toBeGreaterThanOrEqual(0);
  });

  it('non-suspicious message with scheme mention produces no fraud signal', async () => {
    const mockListActiveSchemes = vi.mocked(listActiveSchemes);
    mockListActiveSchemes.mockResolvedValue(MOCK_SCHEMES);

    const request = makeRequest({
      inputType: 'message',
      text: 'What is PM-KISAN?',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean; data: { riskLevel: string; riskScore: number; signals: { code: string }[] } };
    // No fraud signal merely because a scheme is mentioned
    expect(body.data.riskLevel).toBe('low');
    expect(body.data.riskScore).toBe(0);
  });

  it('does not expose server internals in error response', async () => {
    const request = makeRequest({
      inputType: 'message',
      text: '',
    });
    const response = await POST(request as unknown as Parameters<typeof POST>[0]);
    const body = (await response.json()) as { success: boolean; error: { code: string; message: string } };
    expect(body.success).toBe(false);
    expect(body.error.message).toBeDefined();
    expect(body.error.message).not.toContain('Error:');
    expect(body.error.message).not.toContain('at ');
    expect(body.error.message).not.toContain('database');
  });
});

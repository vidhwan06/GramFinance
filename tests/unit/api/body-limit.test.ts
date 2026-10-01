import { describe, it, expect } from 'vitest';
import { readJsonBody } from '@/lib/api/read-json';

/**
 * MED-05: request body limits.
 *
 * `Content-Length` is a client-supplied hint, so the limit has to be enforced
 * on the bytes actually read. Each case below states which of the two paths
 * (declared-length fast path, counted stream read) is expected to catch it.
 */

const LIMIT = 1024;

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/test', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body,
  });
}

async function expectApiError(promise: Promise<unknown>, statusCode: number, code: string) {
  await expect(promise).rejects.toMatchObject({
    name: 'ApiError',
    statusCode,
    code,
  });
}

describe('readJsonBody', () => {
  it('parses a valid body well under the limit', async () => {
    const payload = await readJsonBody<{ message: string }>(
      makeRequest(JSON.stringify({ message: 'hello' })),
      LIMIT
    );
    expect(payload).toEqual({ message: 'hello' });
  });

  it('accepts a body at exactly the allowed boundary', async () => {
    // '{"a":"..."}' — size chosen so the encoded body is exactly LIMIT bytes.
    const filler = 'x'.repeat(LIMIT - '{"a":""}'.length);
    const body = JSON.stringify({ a: filler });
    expect(Buffer.byteLength(body, 'utf8')).toBe(LIMIT);

    const payload = await readJsonBody<{ a: string }>(makeRequest(body), LIMIT);
    expect(payload.a).toBe(filler);
  });

  it('rejects a body one byte over the limit with 413', async () => {
    const body = 'x'.repeat(LIMIT + 1);
    await expectApiError(readJsonBody(makeRequest(body), LIMIT), 413, 'PAYLOAD_TOO_LARGE');
  });

  it('rejects an over-declared Content-Length before reading the body', async () => {
    // Declared far over the limit while the body itself is tiny: the fast path
    // must fire, so no stream read is needed.
    const request = makeRequest(JSON.stringify({ a: 1 }), {
      'content-length': String(LIMIT * 10),
    });
    await expectApiError(readJsonBody(request, LIMIT), 413, 'PAYLOAD_TOO_LARGE');
  });

  it('still enforces the limit when Content-Length is absent', async () => {
    // Chunked-style requests carry no length header; only the counted read can
    // catch these.
    const request = new Request('http://localhost/api/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'x'.repeat(LIMIT + 1),
    });
    expect(request.headers.get('content-length')).toBeNull();
    await expectApiError(readJsonBody(request, LIMIT), 413, 'PAYLOAD_TOO_LARGE');
  });

  it('ignores a malformed Content-Length and falls back to counting bytes', async () => {
    const notANumber = makeRequest(JSON.stringify({ a: 1 }), { 'content-length': 'abc' });
    await expect(readJsonBody(notANumber, LIMIT)).resolves.toEqual({ a: 1 });

    const stillEnforced = makeRequest('x'.repeat(LIMIT + 1), { 'content-length': 'abc' });
    await expectApiError(readJsonBody(stillEnforced, LIMIT), 413, 'PAYLOAD_TOO_LARGE');
  });

  it('catches a Content-Length that lies low about the real body size', async () => {
    // The fast path is satisfied by the small declared value; the counted read
    // must still reject the actual payload.
    const request = makeRequest('x'.repeat(LIMIT + 1), { 'content-length': '10' });
    await expectApiError(readJsonBody(request, LIMIT), 413, 'PAYLOAD_TOO_LARGE');
  });

  it('returns 400 (not 413) for malformed JSON within the limit', async () => {
    await expectApiError(readJsonBody(makeRequest('{not json'), LIMIT), 400, 'BAD_REQUEST');
    await expectApiError(readJsonBody(makeRequest(''), LIMIT), 400, 'BAD_REQUEST');
  });

  it('decodes multi-byte characters as UTF-8 like request.json() does', async () => {
    const payload = await readJsonBody<{ text: string }>(
      makeRequest(JSON.stringify({ text: 'ಗ್ರಾಮ ಫೈನಾನ್ಸ್ ₹500' })),
      LIMIT
    );
    expect(payload.text).toBe('ಗ್ರಾಮ ಫೈನಾನ್ಸ್ ₹500');
  });
});

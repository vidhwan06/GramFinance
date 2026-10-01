import { ErrorFactories } from './errors';

/**
 * Reads a JSON request body without ever buffering more than `maxBytes`.
 *
 * Why not just check `Content-Length`? Because that header is supplied by the
 * client. A client may omit it entirely (chunked transfer), send a
 * non-numeric value, or declare a small length while uploading far more.
 * `request.json()` would happily materialise all of it before Zod ever saw the
 * payload, so the check would be a speed bump rather than a boundary.
 *
 * This helper therefore uses `Content-Length` only as a cheap early exit, and
 * enforces the real limit on the bytes it actually counts while reading the
 * stream. Nothing larger than `maxBytes` is ever assembled in memory.
 *
 * Errors are thrown as `ApiError` so the caller's existing `catch` and
 * `errorResponse()` turn them into the usual envelope:
 *   - 413 PAYLOAD_TOO_LARGE   declared or actual size over the limit
 *   - 400 BAD_REQUEST         body is not valid JSON
 */
export async function readJsonBody<T = unknown>(
  request: Request,
  maxBytes: number
): Promise<T> {
  const declared = request.headers.get('content-length');
  if (declared !== null) {
    const bytes = Number(declared);
    // Missing / non-numeric values simply fall through to the counted read,
    // which a client cannot lie about.
    if (Number.isFinite(bytes) && bytes > maxBytes) {
      throw ErrorFactories.payloadTooLarge();
    }
  }

  const raw = await readStreamWithLimit(request, maxBytes);

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Deliberately vague: a parse error can echo fragments of the body.
    throw ErrorFactories.badRequest('Request body must be valid JSON.');
  }
}

async function readStreamWithLimit(request: Request, maxBytes: number): Promise<string> {
  const stream = request.body;
  if (!stream) return '';

  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;

      total += value.byteLength;
      if (total > maxBytes) {
        throw ErrorFactories.payloadTooLarge();
      }
      chunks.push(value);
    }
  } catch (error) {
    // Stop the client uploading the rest before propagating.
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    reader.releaseLock();
  }

  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(merged);
}

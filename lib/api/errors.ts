export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;
  /**
   * Response headers to emit alongside this error.
   *
   * Used by the rate limiter to carry `Retry-After`, which has to travel on the
   * 429 response itself rather than in the body — a client deciding how long to
   * back off should not have to parse an error envelope to find out.
   */
  public readonly headers?: Record<string, string>;

  constructor(
    message: string,
    statusCode = 500,
    code = 'INTERNAL_ERROR',
    details?: unknown,
    headers?: Record<string, string>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.headers = headers;
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export const ErrorFactories = {
  badRequest: (message = 'Bad Request', details?: unknown) =>
    new ApiError(message, 400, 'BAD_REQUEST', details),
  unauthorized: (message = 'Unauthorized') =>
    new ApiError(message, 401, 'UNAUTHORIZED'),
  forbidden: (message = 'Forbidden') =>
    new ApiError(message, 403, 'FORBIDDEN'),
  notFound: (message = 'Resource Not Found') =>
    new ApiError(message, 404, 'NOT_FOUND'),
  /**
   * `retryAfterSeconds`, when provided, becomes a `Retry-After` header on the
   * response. Omitted entirely when absent, so the header never appears with a
   * meaningless value.
   */
  rateLimited: (message = 'Too Many Requests — Please wait a moment', retryAfterSeconds?: number) =>
    new ApiError(
      message,
      429,
      'RATE_LIMITED',
      undefined,
      retryAfterSeconds !== undefined ? { 'Retry-After': String(retryAfterSeconds) } : undefined
    ),
  payloadTooLarge: (message = 'Request body is too large.') =>
    new ApiError(message, 413, 'PAYLOAD_TOO_LARGE'),
  internal: (message = 'An unexpected internal error occurred') =>
    new ApiError(message, 500, 'INTERNAL_ERROR'),
  serviceUnavailable: (message = 'Service temporarily unavailable') =>
    new ApiError(message, 533, 'SERVICE_UNAVAILABLE'),
  aiUnavailable: (message = 'The AI assistant is temporarily unavailable. Please try again later.') =>
    new ApiError(message, 503, 'AI_UNAVAILABLE'),
  /**
   * Session creation could not be completed — Supabase is unconfigured,
   * anonymous sign-ins are disabled on the project, or the upstream refused.
   *
   * Deliberately separate from `serviceUnavailable` rather than reusing it, so
   * this route does not inherit that factory's non-standard 533 status. A
   * deployment missing GEMINI_API_KEY or anonymous sign-ins enabled is exactly
   * the case a health check and an uptime monitor need to see as a real 503.
   */
  authUnavailable: (message = 'Sign-in is temporarily unavailable. Please try again later.') =>
    new ApiError(message, 503, 'AUTH_UNAVAILABLE'),
  clientIpUnavailable: (message = 'Sign-in is temporarily unavailable. Please try again later.') =>
    new ApiError(message, 503, 'AUTH_UNAVAILABLE'),
};

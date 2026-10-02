export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 500, code = 'INTERNAL_ERROR', details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
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
  rateLimited: (message = 'Too Many Requests — Please wait a moment') =>
    new ApiError(message, 429, 'RATE_LIMITED'),
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

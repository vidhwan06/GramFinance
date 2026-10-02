import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';
import { ApiError } from './errors';

/**
 * Optional headers let a route attach caching and conditional-request metadata
 * (`Cache-Control`, `ETag`) without abandoning the shared envelope. The
 * parameter is appended after `status` so every existing call site is unchanged.
 */
export function successResponse<T>(
  data: T,
  status = 200,
  headers?: Record<string, string>
): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status, headers }
  );
}

export function errorResponse(error: unknown): NextResponse<ApiResponse> {
  const isApiError = error instanceof ApiError;
  const statusCode = isApiError ? error.statusCode : 500;
  const code = isApiError ? error.code : 'INTERNAL_ERROR';
  const message = isApiError ? error.message : 'An unexpected error occurred';
  const details = isApiError ? error.details : undefined;
  // Only an ApiError may contribute headers; anything else is an unexpected
  // failure and must not be able to influence the response's cache or
  // conditional-request behaviour.
  const headers = isApiError ? error.headers : undefined;

  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status: statusCode, headers }
  );
}

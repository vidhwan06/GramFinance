import { NextResponse } from 'next/server';
import { ApiResponse } from '@/types/api';
import { ApiError } from './errors';

export function successResponse<T>(data: T, status = 200): NextResponse<ApiResponse<T>> {
  return NextResponse.json(
    {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
      },
    },
    { status }
  );
}

export function errorResponse(error: unknown): NextResponse<ApiResponse> {
  const isApiError = error instanceof ApiError;
  const statusCode = isApiError ? error.statusCode : 500;
  const code = isApiError ? error.code : 'INTERNAL_ERROR';
  const message = isApiError ? error.message : 'An unexpected error occurred';
  const details = isApiError ? error.details : undefined;

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
    { status: statusCode }
  );
}

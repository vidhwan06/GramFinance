import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api/response';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  return successResponse({
    message: 'Assistant API route placeholder ready.',
    received: body,
  });
}

import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api/response';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  return successResponse({
    message: 'Schemes API route placeholder ready.',
    filters: Object.fromEntries(searchParams.entries()),
  });
}

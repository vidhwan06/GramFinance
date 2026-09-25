import { successResponse } from '@/lib/api/response';

export async function POST() {
  return successResponse({
    message: 'OCR API route placeholder ready.',
  });
}

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function SchemeNotFound() {
  return (
    <div className="flex flex-col items-center justify-center text-center space-y-4 py-10">
      <h1 className="text-3xl font-extrabold text-gray-900">Scheme not available</h1>
      <p className="text-base text-gray-600 max-w-md">
        This scheme does not exist, or it is not published yet. We only show schemes
        after their details have been verified.
      </p>
      <Link href="/schemes" className="rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-green-700 focus-visible:ring-offset-2">
        <Button variant="primary">Back to schemes</Button>
      </Link>
    </div>
  );
}

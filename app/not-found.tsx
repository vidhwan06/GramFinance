import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-warm-ivory">
      <div className="w-20 h-20 bg-deep-teal/10 text-deep-teal rounded-full flex items-center justify-center text-4xl font-bold mb-6">
        404
      </div>
      <h1 className="text-3xl font-extrabold text-ink mb-2">Page Not Found</h1>
      <p className="text-base text-muted-ink max-w-md mb-8">
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/home">
        <Button variant="primary" size="lg">
          Return to Home
        </Button>
      </Link>
    </div>
  );
}

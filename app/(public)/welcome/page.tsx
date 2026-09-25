import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function WelcomePage() {
  return (
    <div className="text-center py-4">
      <h1 className="text-2xl font-black text-gray-900 mb-2">Welcome to GramFinance</h1>
      <p className="text-base text-gray-600 mb-6">
        Understand. Verify. Decide Safely. Digital financial safety for rural households.
      </p>
      <Link href="/home">
        <Button variant="primary" className="w-full">
          Get Started
        </Button>
      </Link>
    </div>
  );
}

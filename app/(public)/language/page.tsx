import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { LanguageSwitcher } from '@/components/layout/LanguageSwitcher';

export default function LanguageSelectPage() {
  return (
    <div className="text-center py-4">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Choose Language / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ</h1>
      <div className="my-6 flex justify-center">
        <LanguageSwitcher />
      </div>
      <Link href="/home">
        <Button variant="primary" className="w-full">
          Continue
        </Button>
      </Link>
    </div>
  );
}

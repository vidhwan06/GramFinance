import { FraudChecker } from '@/features/fraud/components/FraudChecker';

export const metadata = {
  title: 'Check Message | GramFinance',
  description: 'Scan suspicious messages and payment requests. Get risk indicators and safety guidance.',
};

export default function CheckPage() {
  return (
    <div className="min-h-screen bg-paper">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg bg-seal-red/10"
              aria-hidden="true"
            >
              <svg
                className="h-5 w-5 text-seal-red"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                <polyline points="9 12 11 14 15 10" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
              Fraud Checker
            </h1>
          </div>
          <p className="text-base text-gray-600 leading-relaxed">
            Check suspicious messages and claims for common fraud warning signs.
          </p>
        </header>

        {/* Fraud Checker */}
        <FraudChecker />
      </div>
    </div>
  );
}

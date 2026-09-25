import type { Metadata } from 'next';
import './globals.css';
import { LanguageProvider } from '@/features/language/hooks/useLanguage';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';

export const metadata: Metadata = {
  title: 'GramFinance — Understand. Verify. Decide Safely.',
  description: 'A Multilingual Digital Financial Safety & Literacy Platform for Rural Households.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col bg-slate-50 text-slate-900">
        <LanguageProvider>
          <OfflineIndicator />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

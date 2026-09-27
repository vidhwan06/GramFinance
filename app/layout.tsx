import type { Metadata } from 'next';
import './globals.css';
import { Noto_Sans, Noto_Sans_Kannada } from 'next/font/google';
import { LanguageProvider } from '@/features/language/hooks/useLanguage';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';

const notoSans = Noto_Sans({
  subsets: ['latin'],
  variable: '--font-noto-sans',
  display: 'swap',
});

const notoSansKannada = Noto_Sans_Kannada({
  subsets: ['latin'],
  variable: '--font-noto-sans-kannada',
  display: 'swap',
});

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
    <html lang="en" className={`${notoSans.variable} ${notoSansKannada.variable}`}>
      <body className="antialiased min-h-screen flex flex-col bg-paper text-ink font-sans">
        <LanguageProvider>
          <OfflineIndicator />
          {children}
        </LanguageProvider>
      </body>
    </html>
  );
}

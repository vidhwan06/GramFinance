import React from 'react';
import { CheckView } from '@/features/fraud/components/CheckView';

export const metadata = {
  title: 'Stay Safe · Scam Inspector | GramFinance',
  description:
    'Paste a suspicious SMS, WhatsApp forward or payment reminder. GramFinance points out manipulative urgency, unofficial fees and OTP requests, and compares scheme claims with official records.',
};

export default function CheckPage() {
  return <CheckView />;
}

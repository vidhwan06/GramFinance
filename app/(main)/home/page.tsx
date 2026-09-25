'use client';

import React from 'react';
import Link from 'next/link';
import { useLanguage } from '@/features/language/hooks/useLanguage';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { ShieldAlert, Calculator, Landmark, BookOpen, MessageSquare } from 'lucide-react';

export default function HomePage() {
  const { t } = useLanguage();

  const cards = [
    {
      href: '/check',
      icon: ShieldAlert,
      title: t.home.cards.check.title,
      desc: t.home.cards.check.desc,
      color: 'bg-red-50 text-red-700 border-red-200',
    },
    {
      href: '/loan',
      icon: Calculator,
      title: t.home.cards.loan.title,
      desc: t.home.cards.loan.desc,
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    },
    {
      href: '/schemes',
      icon: Landmark,
      title: t.home.cards.schemes.title,
      desc: t.home.cards.schemes.desc,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
    },
    {
      href: '/learn',
      icon: BookOpen,
      title: t.home.cards.learn.title,
      desc: t.home.cards.learn.desc,
      color: 'bg-purple-50 text-purple-700 border-purple-200',
    },
    {
      href: '/assistant',
      icon: MessageSquare,
      title: t.home.cards.assistant.title,
      desc: t.home.cards.assistant.desc,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-800 to-green-700 text-white rounded-2xl p-6 shadow-md">
        <h1 className="text-2xl sm:text-3xl font-black mb-2">{t.home.welcomeTitle}</h1>
        <p className="text-sm sm:text-base text-green-100">{t.home.welcomeSubtitle}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.href} href={card.href} className="focus:outline-none focus:ring-2 focus:ring-green-700 rounded-xl">
              <Card className="h-full transition-all hover:scale-[1.02] cursor-pointer">
                <CardHeader className="flex flex-row items-center space-x-3 pb-2">
                  <div className={`p-3 rounded-xl border ${card.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">{card.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{card.desc}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import React, { ReactNode } from 'react';

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center bg-slate-50 px-4">
      <div className="w-full max-w-md bg-white p-6 rounded-2xl shadow-md border border-gray-200">
        {children}
      </div>
    </div>
  );
}

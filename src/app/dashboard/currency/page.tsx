'use client';

import { CurrencyConverter } from '@/components/ui/currency-converter';

export default function CurrencyPage() {
  // In a real app, get this from user session/context
  const userId = 'demo-user-id';

  return (
    <div className="p-6">
      <CurrencyConverter userId={userId} />
    </div>
  );
}
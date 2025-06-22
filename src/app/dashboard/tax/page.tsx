'use client';

import { TaxCalculator } from '@/components/ui/tax-calculator';

export default function TaxPage() {
  // In a real app, get this from user session/context
  const userId = 'demo-user-id';

  return (
    <div className="p-6">
      <TaxCalculator userId={userId} />
    </div>
  );
}
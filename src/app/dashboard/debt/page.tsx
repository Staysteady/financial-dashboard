'use client';

import { DebtCalculator } from '@/components/ui/debt-calculator';

export default function DebtPage() {
  // In a real app, get this from user session/context
  const userId = 'demo-user-id';

  return (
    <div className="p-6">
      <DebtCalculator userId={userId} />
    </div>
  );
}
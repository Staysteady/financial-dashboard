'use client';

import { ExpenseSplitter } from '@/components/ui/expense-splitter';

export default function ExpensesPage() {
  // In a real app, get this from user session/context
  const userId = 'demo-user-id';

  return (
    <div className="p-6">
      <ExpenseSplitter userId={userId} />
    </div>
  );
}
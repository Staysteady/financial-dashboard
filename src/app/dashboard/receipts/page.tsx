'use client';

import { ReceiptScanner } from '@/components/ui/receipt-scanner';

export default function ReceiptsPage() {
  // In a real app, get this from user session/context
  const userId = 'demo-user-id';

  return (
    <div className="p-6">
      <ReceiptScanner userId={userId} />
    </div>
  );
}
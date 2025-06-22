'use client';

import { PortfolioDashboard } from '@/components/ui/portfolio-dashboard';

export default function PortfolioPage() {
  // In a real app, get these from user session/context
  const userId = 'demo-user-id';
  const accountId = 'demo-investment-account';

  return (
    <div className="p-6">
      <PortfolioDashboard userId={userId} accountId={accountId} />
    </div>
  );
}
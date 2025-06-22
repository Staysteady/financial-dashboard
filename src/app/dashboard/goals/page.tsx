'use client';

import { GoalsDashboard } from '@/components/ui/goals-dashboard';

export default function GoalsPage() {
  // In a real app, get this from user session/context
  const userId = 'demo-user-id';

  return (
    <div className="p-6">
      <GoalsDashboard userId={userId} />
    </div>
  );
}
'use client';

import { RetirementPlanner } from '@/components/ui/retirement-planner';

export default function RetirementPage() {
  // In a real app, get this from user session/context
  const userId = 'demo-user-id';

  return (
    <div className="p-6">
      <RetirementPlanner userId={userId} />
    </div>
  );
}
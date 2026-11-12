'use client';

import { PlanBoard } from '@/components/plan-board';

export default function BillingPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="ui-title">Plan</h1>
        <p className="ui-copy">
          Your restaurant is on the plan below. New restaurants start with 30 days of Advanced, then the queue stays closed until a plan is active.
        </p>
      </div>
      <PlanBoard />
    </div>
  );
}

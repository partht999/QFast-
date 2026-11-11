import { Suspense } from 'react';
import AnalyticsView from './view';

export default function AnalyticsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-gray-500">Loading analytics…</div>}>
      <AnalyticsView />
    </Suspense>
  );
}

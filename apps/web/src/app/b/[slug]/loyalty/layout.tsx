import { Suspense } from 'react';

export default function LoyaltyLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-orange-50" />}>{children}</Suspense>;
}

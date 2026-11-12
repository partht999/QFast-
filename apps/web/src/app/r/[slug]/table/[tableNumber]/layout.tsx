import { Suspense } from 'react';

export default function TableOrderLayout({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div className="min-h-screen bg-neutral-50" />}>{children}</Suspense>;
}

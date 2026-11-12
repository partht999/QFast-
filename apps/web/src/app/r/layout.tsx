import type { Metadata } from 'next';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function RestaurantPublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-50 text-neutral-950">{children}</div>;
}

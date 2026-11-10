import type { Metadata } from 'next';
import { IndustryLandingPage } from '@/components/industry-landing-page';

export const metadata: Metadata = {
  title: 'Qfast for cafes',
  description: 'A shorter line, table QR ordering, a bill, and a stamp card for regulars.',
};

export default function CafesPage() {
  return <IndustryLandingPage type="CAFE" />;
}

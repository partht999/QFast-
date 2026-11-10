import type { Metadata } from 'next';
import { IndustryLandingPage } from '@/components/industry-landing-page';

export const metadata: Metadata = {
  title: 'Qfast for restaurants',
  description: 'Walk-in queue, table QR ordering, kitchen tickets, bills, stamp cards, and a Google review after the meal.',
};

export default function RestaurantsPage() {
  return <IndustryLandingPage type="RESTAURANT" />;
}


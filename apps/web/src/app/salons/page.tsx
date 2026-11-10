import type { Metadata } from 'next';
import { IndustryLandingPage } from '@/components/industry-landing-page';

export const metadata: Metadata = {
  title: 'Qfast for salons',
  description: 'A walk-in queue for salons. Guests join from a QR code and you call the next person from one board.',
};

export default function SalonsPage() {
  return <IndustryLandingPage type="SALON" />;
}


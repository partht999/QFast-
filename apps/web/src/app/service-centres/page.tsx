import type { Metadata } from 'next';
import { IndustryLandingPage } from '@/components/industry-landing-page';

export const metadata: Metadata = {
  title: 'Qfast for service centres',
  description: 'A live counter queue for inspection, warranty, and pickup desks.',
};

export default function ServiceCentresPage() {
  return <IndustryLandingPage type="SERVICE_CENTRE" />;
}


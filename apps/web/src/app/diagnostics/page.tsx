import type { Metadata } from 'next';
import { IndustryLandingPage } from '@/components/industry-landing-page';

export const metadata: Metadata = {
  title: 'Qfast for diagnostic centres',
  description: 'Arrival-order queues for collection and imaging desks, with a Google review after the visit.',
};

export default function DiagnosticsPage() {
  return <IndustryLandingPage type="DIAGNOSTIC_CENTRE" />;
}


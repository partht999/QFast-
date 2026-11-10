import type { Metadata } from 'next';
import { IndustryLandingPage } from '@/components/industry-landing-page';

export const metadata: Metadata = {
  title: 'Qfast for clinics',
  description: 'A live arrival queue for clinics. Visitors follow their place in line, and a finished visit can ask for a Google review.',
};

export default function ClinicsPage() {
  return <IndustryLandingPage type="CLINIC" />;
}


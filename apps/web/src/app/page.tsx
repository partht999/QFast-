import { MarketingFooter } from '@/components/marketing-footer';
import { MarketingHeader } from '@/components/marketing-header';
import { HomePage as HomeContent } from '@/components/home/home-page';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#fffaf6] text-slate-950">
      <MarketingHeader />
      <HomeContent />
      <MarketingFooter />
    </main>
  );
}

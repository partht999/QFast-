import { MarketingFooter } from '@/components/marketing-footer';
import { MarketingHeader } from '@/components/marketing-header';
import { PricingPlans } from '@/components/pricing-plans';

const faqs = [
  {
    q: 'Do customers need to download an app?',
    a: 'No. They scan your entrance QR or open the link you share and join in the browser.',
  },
  {
    q: 'Can people browse every business on Qfast and join from a directory?',
    a: 'No. Each business has its own join link and QR code. There is no public list of organizations.',
  },
  {
    q: 'What happens after the free Pro month?',
    a: 'Pro is ₹3,999/month after the first month. If you do not stay on Pro, the workspace returns to the Free plan.',
  },
  {
    q: 'Can I use Qfast if I am not a restaurant?',
    a: 'Yes. Clinics, salons, diagnostic labs, and service centres use the same queue. Table ordering and the kitchen display are there for restaurants and cafes.',
  },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 text-center sm:px-8">
          <p className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-300">
            Three plans
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">A free queue, then room to grow.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Free covers one live queue. Plus is ₹999/month. Pro is ₹3,999/month, and the first month is free.
          </p>
        </div>
      </section>
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <PricingPlans />
        <div className="mt-20 border-t border-slate-200 pt-16">
          <h2 className="text-center text-3xl font-black">Questions before you start</h2>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {faqs.map((faq) => (
              <article key={faq.q} className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
                <h3 className="font-bold">{faq.q}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{faq.a}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

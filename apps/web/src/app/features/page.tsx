import Link from 'next/link';
import { ArrowRight, Ticket, QrCode, Bell, ShieldCheck, Users, Sparkles, UtensilsCrossed, Gift, Receipt } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';

export default function FeaturesPage() {
  const features = [
    {
      icon: Ticket,
      title: 'Smart Live Queue Management',
      desc: 'Let customers enter the queue virtually or at your reception. Real-time updates with wait time predictions keep guests informed without crowding your lobby.',
    },
    {
      icon: QrCode,
      title: 'Instant QR Code Check-in',
      desc: 'No apps to install. Customers scan a clean, branded QR code on their smartphone browser to grab a token or place an order in seconds.',
    },
    {
      icon: Bell,
      title: 'Live status in the browser',
      desc: 'While the join page stays open, the customer sees their place, the wait, and when they are called.',
    },
    {
      icon: UtensilsCrossed,
      title: 'Table QR ordering',
      desc: 'A table code opens the menu for that table. Guests order without joining the entrance queue, then see the bill for that visit.',
    },
    {
      icon: Receipt,
      title: 'A bill the guest can read',
      desc: 'The running bill shows the business, table or token, items, GST, and the total. After it closes, the visit ends.',
    },
    {
      icon: Gift,
      title: 'Stamp cards',
      desc: 'The phone number collected at the visit earns a stamp. A full card tells the guest to show the phone at the counter.',
    },
    {
      icon: ShieldCheck,
      title: 'A private staff board',
      desc: 'The queue board sits behind the owner login. Customers only see their own token.',
    },
    {
      icon: Users,
      title: 'One workspace per business',
      desc: 'Each organisation gets its own queue, QR code, and customer join page.',
    },
  ];

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-300">
            <Sparkles className="h-3.5 w-3.5 text-orange-400" /> Platform Capabilities
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
            Everything you need for seamless customer flow
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Live queues, QR check-in, and a staff board for clinics, salons, labs, service centres, and restaurants.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Icon className="h-6 w-6" />
                </div>
                <h2 className="mt-5 text-xl font-bold">{f.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{f.desc}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-16 rounded-3xl bg-slate-50 p-8 sm:p-12 border border-slate-200 text-center">
          <h2 className="text-2xl font-black sm:text-3xl">Open a queue in one sitting.</h2>
          <p className="mt-3 text-slate-600 max-w-xl mx-auto text-sm leading-6">
            Create the workspace, print the entrance QR, and call the next person from the staff board. The full product is free for 30 days.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/register"
              className="ui-btn-primary px-5"
            >
              Get started <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}


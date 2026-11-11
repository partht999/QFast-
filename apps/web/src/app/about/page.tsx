import Link from 'next/link';
import { ArrowRight, Target, Users, ShieldCheck } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-300">
            Our Mission
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
            Building the world&apos;s clearest customer flow
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            We believe waiting shouldn&apos;t feel like a mystery. Qfast was founded to replace crowded waiting rooms, paper tickets, and shouting names with elegant, digital clarity.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8 space-y-16">
        <div className="grid gap-8 md:grid-cols-2 items-center">
          <div>
            <span className="text-xs font-black uppercase tracking-wider text-orange-600">The Problem</span>
            <h2 className="mt-2 text-3xl font-black text-slate-900">Uncertainty is the enemy of hospitality & care</h2>
            <p className="mt-4 text-sm leading-7 text-slate-600">
              Whether visiting a healthcare clinic, enjoying dinner at a popular restaurant, or getting a quick haircut, waiting blindly breeds frustration. Businesses struggle to balance walk-in traffic with staff capacity, leading to lost revenue and stressed teams.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 space-y-4">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Target className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Transparency First</h3>
                <p className="text-xs text-slate-500 mt-0.5">Real-time status updates allow guests to stroll nearby instead of standing uncomfortably in line.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <Users className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Empowered Staff</h3>
                <p className="text-xs text-slate-500 mt-0.5">Simple one-click calls and status progressions keep front-of-house calm and organized.</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Frictionless Adoption</h3>
                <p className="text-xs text-slate-500 mt-0.5">Zero apps to download for customers. Works instantly on any modern smartphone browser.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-16 text-center">
          <h2 className="text-3xl font-black text-slate-900">Built for businesses of all sizes</h2>
          <p className="mt-3 text-sm text-slate-600 max-w-xl mx-auto">
            From single-doctor clinics and neighbourhood cafes to national retail networks, Qfast scales seamlessly to deliver a world-class customer arrival experience.
          </p>
          <div className="mt-8">
            <Link
              href="/auth/register"
              className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-orange-600"
            >
              Get started with Qfast <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}


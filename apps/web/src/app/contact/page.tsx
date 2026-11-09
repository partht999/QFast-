'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Send, HelpCircle } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';

export default function ContactPage() {
  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-300">
            Contact & Support
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">
            We&apos;re here to help you get started
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Have questions about custom workflows, hardware printing, or multi-location rollout? Our team is always ready to talk.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-20 sm:px-8">
        <div className="grid gap-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-black text-slate-900">Get in touch</h2>
            <p className="mt-3 text-sm text-slate-600 leading-6">
              Fill out the form or reach out directly. We typically respond within a few business hours.
            </p>

            <div className="mt-8 space-y-6">
              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Email Us</p>
                  <p className="text-sm font-semibold text-slate-800">support@qfast.in</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <Phone className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Direct Support</p>
                  <p className="text-sm font-semibold text-slate-800">+91 98765 43210 (Mon-Sat, 9am - 7pm IST)</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <MapPin className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Headquarters</p>
                  <p className="text-sm font-semibold text-slate-800">Indiranagar, Bengaluru, Karnataka, India</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-8 shadow-xs">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Send a message</h3>
            <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Patel"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Business Email</label>
                <input
                  type="email"
                  required
                  placeholder="owner@yourcompany.com"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-slate-600 mb-1">Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="How can we help your business?"
                  className="w-full rounded-xl border border-slate-200 p-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-bold text-white shadow-md hover:bg-orange-600 transition"
              >
                Send Message <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </section>
      <MarketingFooter />
    </main>
  );
}

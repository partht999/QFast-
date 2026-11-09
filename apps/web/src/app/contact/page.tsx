'use client';

import { FormEvent, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { MarketingHeader } from '@/components/marketing-header';
import { MarketingFooter } from '@/components/marketing-footer';

const supportEmail = 'support@qfast.in';

export default function ContactPage() {
  const [sent, setSent] = useState(false);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get('name') || '').trim();
    const email = String(form.get('email') || '').trim();
    const message = String(form.get('message') || '').trim();
    const subject = encodeURIComponent(`Qfast support from ${name || 'a business'}`);
    const body = encodeURIComponent(`Name: ${name}\nEmail: ${email}\n\n${message}`);
    window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
    setSent(true);
  };

  return (
    <main className="min-h-screen bg-white text-slate-950">
      <MarketingHeader />
      <section className="bg-slate-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-7xl px-5 text-center sm:px-8">
          <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-widest text-orange-300">
            Contact and support
          </p>
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">Tell us what is getting in the way.</h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">
            Questions about setup, queues, or plans go straight to the support inbox. The form opens your email app with the message filled in.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl gap-12 px-5 py-20 sm:px-8 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-black">Email support</h2>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            We read messages on business days. Include the business name and the queue link if something failed.
          </p>
          <a href={`mailto:${supportEmail}`} className="mt-8 flex items-center gap-4">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <Mail className="h-5 w-5" />
            </span>
            <span>
              <span className="block text-xs font-bold uppercase tracking-wider text-slate-400">Email</span>
              <span className="text-sm font-semibold text-slate-800">{supportEmail}</span>
            </span>
          </a>
        </div>

        <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-200 bg-slate-50 p-8">
          <h3 className="mb-4 text-lg font-bold">Send a message</h3>
          <div className="space-y-4">
            <div>
              <label htmlFor="contact-name" className="mb-1 block text-xs font-bold uppercase text-slate-600">Your name</label>
              <input id="contact-name" name="name" required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1 block text-xs font-bold uppercase text-slate-600">Work email</label>
              <input id="contact-email" name="email" type="email" required className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <div>
              <label htmlFor="contact-message" className="mb-1 block text-xs font-bold uppercase text-slate-600">Message</label>
              <textarea id="contact-message" name="message" required rows={4} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400" />
            </div>
            <button type="submit" className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 py-3 font-bold text-white hover:bg-orange-600">
              Open email <Send className="h-4 w-4" />
            </button>
            {sent && (
              <p className="text-sm leading-6 text-slate-600">
                Your email app should open with this message addressed to {supportEmail}. If it does not, send the same note there directly.
              </p>
            )}
          </div>
        </form>
      </section>
      <MarketingFooter />
    </main>
  );
}

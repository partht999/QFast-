'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

type Card = {
  hasProgram: boolean;
  businessName: string;
  stamps: number;
  stampsForReward: number;
  rewardName: string;
};

export default function CustomerLoyaltyPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const phoneParam = searchParams.get('phone') || '';
  const publicPath = pathname.startsWith('/c/') ? `/c/${slug}` : pathname.startsWith('/b/') ? `/b/${slug}` : `/r/${slug}`;
  const apiUrl = getApiUrl();
  const [phone, setPhone] = useState(phoneParam);
  const [card, setCard] = useState<Card | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [goal, setGoal] = useState(8);
  const [rewardName, setRewardName] = useState('Free visit');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/loyalty/public/${slug}/offers`)
      .then((response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (!data) return;
        setBusinessName(data.businessName || '');
        setGoal(data.stampsForReward || 8);
        setRewardName(data.rewardName || 'Free visit');
      })
      .catch(() => setError('Could not load the stamp card.'));
  }, [apiUrl, slug]);

  const checkCard = async (number: string) => {
    if (!number.trim()) return;
    setChecking(true);
    setError('');
    try {
      const response = await fetch(`${apiUrl}/api/v1/loyalty/public/${slug}/${encodeURIComponent(number.trim())}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not find this card');
      setCard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find this card');
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    if (phoneParam) void checkCard(phoneParam);
  }, [phoneParam]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    void checkCard(phone);
  };

  const stamps = card?.stamps || 0;
  const target = card?.stampsForReward || goal;
  const prize = card?.rewardName || rewardName;

  return (
    <main className="min-h-screen bg-orange-50 px-4 py-8 text-slate-950">
      <div className="mx-auto max-w-md">
        <Link href={publicPath} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600">
          <ArrowLeft className="h-4 w-4" />
          Back
        </Link>
        <section className="mt-5 rounded-3xl bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold text-orange-700">{card?.businessName || businessName || 'Stamp card'}</p>
          <h1 className="mt-1 text-3xl font-black">Collect {target} stamps</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Each visit adds one stamp. A full card is {prize}. Ask the counter to mark it.</p>

          <div className="mt-6 grid grid-cols-4 gap-3">
            {Array.from({ length: target }).map((_, index) => (
              <div
                key={index}
                className={`flex aspect-square items-center justify-center rounded-full border-2 text-sm font-black ${
                  index < stamps ? 'border-orange-500 bg-orange-500 text-white' : 'border-dashed border-orange-200 text-orange-300'
                }`}
              >
                {index + 1}
              </div>
            ))}
          </div>
          <p className="mt-4 text-sm font-semibold text-slate-700">
            {card ? `${stamps} of ${target}${stamps >= target ? ' · show this at the counter' : ''}` : 'Enter your mobile number to see your stamps.'}
          </p>

          <form onSubmit={submit} className="mt-4 flex gap-2">
            <input
              type="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Mobile number"
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-base outline-none focus:border-orange-400"
            />
            <button type="submit" disabled={checking} className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
              {checking ? '…' : 'View'}
            </button>
          </form>
          {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        </section>
      </div>
    </main>
  );
}

'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';
import { Gift, Sparkles, ArrowLeft, CircleHelp } from 'lucide-react';
import { getApiUrl } from '@/lib/api';

type Wallet = {
  hasProgram: boolean;
  businessName: string;
  points: number;
  transactions: Array<{
    id: string;
    type: string;
    points: number;
    reason: string | null;
    createdAt: string;
  }>;
};

type Reward = {
  id: string;
  name: string;
  pointsCost: number;
  rewardType: string;
  rewardValue: { description?: string } | null;
};

export default function CustomerLoyaltyPage() {
  const { slug } = useParams<{ slug: string }>();
  const pathname = usePathname();
  const publicPath = pathname.startsWith('/c/')
    ? `/c/${slug}`
    : pathname.startsWith('/b/')
      ? `/b/${slug}`
      : `/r/${slug}`;
  const apiUrl = getApiUrl();
  const [businessName, setBusinessName] = useState('');
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [hasProgram, setHasProgram] = useState(true);
  const [phone, setPhone] = useState('');
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/loyalty/public/${slug}/offers`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load loyalty offers');
        return response.json();
      })
      .then((data) => {
        setBusinessName(data.businessName);
        setRewards(data.rewards || []);
        setHasProgram(data.hasProgram);
      })
      .catch((err) => setError(err instanceof Error ? err.message : 'Could not load offers'))
      .finally(() => setLoadingOffers(false));
  }, [apiUrl, slug]);

  const checkBalance = async (event: FormEvent) => {
    event.preventDefault();
    setChecking(true);
    setError('');
    setWallet(null);
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/loyalty/public/${slug}/${encodeURIComponent(phone.trim())}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not check your points');
      setWallet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not check your points');
    } finally {
      setChecking(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-orange-50 px-4 py-8 text-neutral-900">
      <div className="mx-auto max-w-lg">
        <Link
          href={publicPath}
          className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-neutral-500 hover:text-neutral-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to restaurant
        </Link>

        <header className="rounded-3xl bg-gradient-to-br from-orange-600 to-amber-500 p-6 text-white shadow-lg">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles className="h-6 w-6" />
          </div>
          <p className="text-sm font-semibold text-orange-100">{businessName || 'Restaurant'}</p>
          <h1 className="mt-1 text-3xl font-black">Your rewards</h1>
          <p className="mt-2 text-sm text-orange-50">
            Check points earned from completed orders and explore available offers.
          </p>
        </header>

        {hasProgram && (
          <section className="mt-5 rounded-3xl border border-orange-100 bg-white p-5 shadow-sm">
            <h2 className="font-extrabold">Check your points</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Use the same mobile number you gave when placing your order.
            </p>
            <form onSubmit={checkBalance} className="mt-4 flex gap-2">
              <input
                type="tel"
                required
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Mobile number"
                autoComplete="tel"
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 px-3 py-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
              />
              <button
                type="submit"
                disabled={checking || !phone.trim()}
                className="rounded-xl bg-neutral-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                {checking ? 'Checking…' : 'View points'}
              </button>
            </form>

            {wallet && (
              <div className="mt-4 rounded-2xl bg-orange-50 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-orange-700">Available balance</p>
                <p className="mt-1 text-4xl font-black text-neutral-900">
                  {wallet.points.toLocaleString()} <span className="text-lg text-orange-600">pts</span>
                </p>
                {wallet.transactions.length > 0 && (
                  <div className="mt-4 border-t border-orange-100 pt-3">
                    <h3 className="mb-2 text-xs font-bold text-neutral-700">Recent points activity</h3>
                    <div className="space-y-2">
                      {wallet.transactions.map((transaction) => (
                        <div key={transaction.id} className="flex items-center justify-between gap-3 text-xs">
                          <div>
                            <p className="font-semibold text-neutral-700">{transaction.reason || 'Points activity'}</p>
                            <p className="text-neutral-400">
                              {new Date(transaction.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                          <span className={`font-extrabold ${transaction.points >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                            {transaction.points > 0 ? '+' : ''}{transaction.points}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        <section className="mt-5 rounded-3xl border border-neutral-100 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
              <Gift className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-extrabold">Available offers</h2>
              <p className="text-xs text-neutral-500">Rewards published by this restaurant</p>
            </div>
          </div>

          {loadingOffers ? (
            <p className="py-8 text-center text-sm text-neutral-400">Loading offers…</p>
          ) : !hasProgram ? (
            <div className="py-8 text-center">
              <CircleHelp className="mx-auto mb-2 h-7 w-7 text-neutral-300" />
              <p className="text-sm font-semibold text-neutral-600">Loyalty rewards aren’t available yet.</p>
            </div>
          ) : rewards.length ? (
            <div className="mt-4 space-y-3">
              {rewards.map((reward) => (
                <article key={reward.id} className="rounded-2xl border border-neutral-100 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{reward.name}</p>
                      {reward.rewardValue?.description && (
                        <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                          {reward.rewardValue.description}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-extrabold text-amber-800">
                      {reward.pointsCost.toLocaleString()} pts
                    </span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-neutral-400">No active offers right now.</p>
          )}
        </section>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <p className="mt-5 text-center text-[11px] leading-relaxed text-neutral-400">
          Points are added after your order is marked complete. Ask restaurant staff how to redeem an offer.
        </p>
      </div>
    </main>
  );
}

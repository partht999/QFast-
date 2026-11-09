'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Gift } from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { isFoodBusiness } from '@/lib/business-links';
import { readApiError } from '@/lib/read-api-error';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function LoyaltyManagementPage() {
  const [business, setBusiness] = useState<any>(null);
  const [stampsForReward, setStampsForReward] = useState(8);
  const [rewardName, setRewardName] = useState('Free visit');
  const [phone, setPhone] = useState('');
  const [guest, setGuest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantOnly, setRestaurantOnly] = useState(false);
  const [saving, setSaving] = useState(false);
  const [working, setWorking] = useState(false);
  const [stampConfirm, setStampConfirm] = useState<'stamps' | 'redeem' | null>(null);
  const router = useRouter();
  const toast = useToast();
  const apiUrl = getApiUrl();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    fetch(`${apiUrl}/api/v1/business`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.status === 401) {
          router.push('/auth/login');
          return [];
        }
        return response.json();
      })
      .then(async (businesses) => {
        const current = Array.isArray(businesses) ? businesses[0] : null;
        if (!current) return;
        setBusiness(current);
        if (!isFoodBusiness(current.type)) {
          setRestaurantOnly(true);
          return;
        }
        const programResponse = await fetch(`${apiUrl}/api/v1/loyalty/program/${current.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!programResponse.ok) return;
        const program = await programResponse.json();
        setStampsForReward(program.stampsForReward || program.rewards?.[0]?.pointsCost || 8);
        setRewardName(program.rewards?.[0]?.name || 'Free visit');
      })
      .catch(() => toast.error('Could not load stamps', 'Check the connection and try again.'))
      .finally(() => setLoading(false));
  }, [apiUrl, router]);

  const saveCard = async (event: FormEvent) => {
    event.preventDefault();
    if (!business) return;
    setSaving(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${apiUrl}/api/v1/loyalty/program/${business.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'VISIT_STAMPS',
          stampsForReward,
          rewardName,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(readApiError(data, 'Could not save the stamp card'));
      toast.success('Stamp card saved', `${stampsForReward} stamps for ${rewardName}.`);
    } catch (error) {
      toast.error('Could not save', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setSaving(false);
    }
  };

  const lookup = async (event?: FormEvent) => {
    event?.preventDefault();
    if (!business || !phone.trim()) return;
    setWorking(true);
    setGuest(null);
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/loyalty/public/${business.slug}/${encodeURIComponent(phone.trim())}`,
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not find this guest');
      setGuest(data);
    } catch (error) {
      toast.error('Lookup failed', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  };

  const stampAction = async (path: 'stamps' | 'redeem') => {
    if (!business || !phone.trim()) return;
    setWorking(true);
    try {
      const token = localStorage.getItem('accessToken');
      const response = await fetch(`${apiUrl}/api/v1/loyalty/program/${business.id}/${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(Array.isArray(data.message) ? data.message.join(' ') : data.message);
      setGuest(data);
      toast.success(path === 'stamps' ? 'Stamp added' : 'Reward given', data.rewardName || rewardName);
    } catch (error) {
      toast.error('Could not update stamps', error instanceof Error ? error.message : 'Try again.');
    } finally {
      setWorking(false);
    }
  };

  if (loading) {
    return <p className="p-6 text-sm text-slate-500">Loading stamp card…</p>;
  }

  if (restaurantOnly) {
    return (
      <p className="p-6 text-sm text-slate-600">
        Stamp cards are only for restaurants and cafes. Clinics and hospitals ask for a Google review when the visit is complete.
      </p>
    );
  }

  const goal = guest?.stampsForReward || stampsForReward;
  const filled = guest?.stamps || 0;

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-100 text-orange-700">
            <Gift className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-950">Stamp card</h2>
            <p className="text-sm text-slate-500">One stamp per visit. A full card is one reward.</p>
          </div>
        </div>
        <form onSubmit={saveCard} className="mt-5 grid gap-4 sm:grid-cols-[8rem_1fr_auto] sm:items-end">
          <label className="block text-sm font-semibold text-slate-700">
            Stamps
            <input
              type="number"
              min={2}
              max={20}
              value={stampsForReward}
              onChange={(event) => setStampsForReward(Number(event.target.value))}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none focus:border-orange-400"
            />
          </label>
          <label className="block text-sm font-semibold text-slate-700">
            Reward
            <input
              value={rewardName}
              onChange={(event) => setRewardName(event.target.value)}
              maxLength={80}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-3 text-base outline-none focus:border-orange-400"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save card'}
          </button>
        </form>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <h2 className="text-lg font-black text-slate-950">Guest card</h2>
        <p className="mt-1 text-sm text-slate-500">Look up the mobile number, add a stamp, or give the reward when the card is full.</p>
        <form onSubmit={lookup} className="mt-4 flex gap-2">
          <input
            type="tel"
            required
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="Mobile number"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-3 text-base outline-none focus:border-orange-400"
          />
          <button type="submit" disabled={working} className="rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
            Find
          </button>
        </form>

        {guest && (
          <div className="mt-5">
            <p className="text-sm font-semibold text-slate-700">
              {filled} of {goal} stamps
              {filled >= goal ? ' · ready to redeem' : ` · ${goal - filled} to go`}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {Array.from({ length: goal }).map((_, index) => (
                <span
                  key={index}
                  className={`flex h-10 w-10 items-center justify-center rounded-full border text-sm font-black ${
                    index < filled ? 'border-orange-500 bg-orange-500 text-white' : 'border-slate-200 bg-slate-50 text-slate-300'
                  }`}
                >
                  {index + 1}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm text-slate-600">Reward: {guest.rewardName || rewardName}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={working}
                onClick={() => setStampConfirm('stamps')}
                className="rounded-xl bg-slate-950 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
              >
                Add stamp
              </button>
              <button
                type="button"
                disabled={working || filled < goal}
                onClick={() => setStampConfirm('redeem')}
                className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm font-bold text-orange-800 disabled:opacity-40"
              >
                Give reward
              </button>
            </div>
          </div>
        )}
      </section>
      <ConfirmModal
        isOpen={!!stampConfirm}
        onClose={() => setStampConfirm(null)}
        onConfirm={() => {
          const action = stampConfirm;
          setStampConfirm(null);
          if (action) void stampAction(action);
        }}
        title={stampConfirm === 'redeem' ? 'Give this reward?' : 'Add a stamp?'}
        description={
          stampConfirm === 'redeem'
            ? `This uses a full card for ${phone.trim()} and starts the next one.`
            : `Add one visit stamp for ${phone.trim()}.`
        }
        confirmLabel={stampConfirm === 'redeem' ? 'Give reward' : 'Add stamp'}
        cancelLabel="Go back"
        variant={stampConfirm === 'redeem' ? 'warning' : 'primary'}
      />
    </div>
  );
}

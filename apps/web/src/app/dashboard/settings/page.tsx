'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { isFoodBusiness } from '@/lib/business-links';
import { extractGooglePlaceId } from '@/lib/google-place';
import { readApiError } from '@/lib/read-api-error';
import { useToast } from '@/components/ui/toast';

export default function SettingsPage() {
  const router = useRouter();
  const toast = useToast();
  const apiUrl = getApiUrl();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [businessId, setBusinessId] = useState('');
  const [food, setFood] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [googlePlaceId, setGooglePlaceId] = useState('');
  const [averageWaitMinutes, setAverageWaitMinutes] = useState(8);
  const [isOpen, setIsOpen] = useState(true);
  const [remoteJoinEnabled, setRemoteJoinEnabled] = useState(true);
  const [stampsForReward, setStampsForReward] = useState(8);
  const [rewardName, setRewardName] = useState('Free visit');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }
    const headers = { Authorization: `Bearer ${token}` };
    fetch(`${apiUrl}/api/v1/business`, { headers })
      .then(async (response) => {
        if (response.status === 401) {
          router.push('/auth/login');
          return null;
        }
        return response.json();
      })
      .then(async (businesses) => {
        const current = Array.isArray(businesses) ? businesses[0] : null;
        if (!current) {
          setLoading(false);
          return;
        }
        setBusinessId(current.id);
        setFood(isFoodBusiness(current.type));
        setName(current.name || '');
        setPhone(current.phone || '');
        setAddress(current.address || '');
        setGooglePlaceId(current.googlePlaceId || '');
        const queueResponse = await fetch(`${apiUrl}/api/v1/queue/manage/${current.id}`, { headers });
        if (queueResponse.ok) {
          const board = await queueResponse.json();
          const queue = board.queue || board.queues?.[0];
          if (queue) {
            setAverageWaitMinutes(queue.averageWaitMinutes || 8);
            setIsOpen(Boolean(queue.isOpen));
            setRemoteJoinEnabled(queue.remoteJoinEnabled !== false);
          }
        }
        if (isFoodBusiness(current.type)) {
          const loyaltyResponse = await fetch(`${apiUrl}/api/v1/loyalty/program/${current.id}`, { headers });
          if (loyaltyResponse.ok) {
            const program = await loyaltyResponse.json();
            setStampsForReward(program.stampsForReward || program.rewards?.[0]?.pointsCost || 8);
            setRewardName(program.rewards?.[0]?.name || 'Free visit');
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [apiUrl, router]);

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token || !businessId) return;
    setSaving(true);
    try {
      const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const response = await fetch(`${apiUrl}/api/v1/business/${businessId}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({
          name,
          phone,
          address,
          googlePlaceId,
          averageWaitMinutes: Number(averageWaitMinutes),
          isOpen,
          remoteJoinEnabled,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(data, 'Could not save settings'));
      if (food) {
        const loyalty = await fetch(`${apiUrl}/api/v1/loyalty/program/${businessId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ stampsForReward: Number(stampsForReward), rewardName }),
        });
        const loyaltyData = await loyalty.json().catch(() => ({}));
        if (!loyalty.ok) throw new Error(readApiError(loyaltyData, 'Could not save the stamp card'));
      }
      toast.success('Settings saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent) => {
    event.preventDefault();
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    setChangingPassword(true);
    try {
      const response = await fetch(`${apiUrl}/api/v1/users/me/password`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(data, 'Could not change password'));
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Password updated');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not change password');
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-sm text-neutral-500">Loading settings…</div>;
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-neutral-950">Settings</h1>
        <p className="mt-1 text-sm text-neutral-500">
          The name guests see, the queue, the Google review link{food ? ', the stamp card,' : ''} and your password.
        </p>
      </div>

      <form onSubmit={save} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <label className="block text-sm font-semibold text-neutral-800">
          Business name
          <input value={name} onChange={(event) => setName(event.target.value)} required className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="block text-sm font-semibold text-neutral-800">
          Phone
          <input value={phone} onChange={(event) => setPhone(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="block text-sm font-semibold text-neutral-800">
          Address
          <input value={address} onChange={(event) => setAddress(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="block text-sm font-semibold text-neutral-800">
          Usual wait, in minutes
          <input type="number" min={1} max={180} value={averageWaitMinutes} onChange={(event) => setAverageWaitMinutes(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
          <input type="checkbox" checked={isOpen} onChange={(event) => setIsOpen(event.target.checked)} />
          Queue is open
        </label>
        <label className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
          <input type="checkbox" checked={remoteJoinEnabled} onChange={(event) => setRemoteJoinEnabled(event.target.checked)} />
          Guests can join from their phone
        </label>
        <label className="block text-sm font-semibold text-neutral-800">
          Google Maps link
          <input value={googlePlaceId} onChange={(event) => setGooglePlaceId(event.target.value)} placeholder="Paste the listing link from Google Maps" className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
          {googlePlaceId.trim() && extractGooglePlaceId(googlePlaceId) && (
            <span className="mt-1 block text-xs font-medium text-emerald-700">Place ID: {extractGooglePlaceId(googlePlaceId)}</span>
          )}
        </label>
        {food && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-neutral-800">
              Stamps for a reward
              <input type="number" min={2} max={20} value={stampsForReward} onChange={(event) => setStampsForReward(Number(event.target.value))} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
            </label>
            <label className="block text-sm font-semibold text-neutral-800">
              Reward
              <input value={rewardName} onChange={(event) => setRewardName(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
            </label>
          </div>
        )}
        <button type="submit" disabled={saving} className="rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      <form onSubmit={changePassword} className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-5">
        <h2 className="text-lg font-black text-neutral-950">Password</h2>
        <label className="block text-sm font-semibold text-neutral-800">
          Current password
          <input type="password" required minLength={8} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
        </label>
        <label className="block text-sm font-semibold text-neutral-800">
          New password
          <input type="password" required minLength={8} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm" />
        </label>
        <button type="submit" disabled={changingPassword} className="rounded-xl bg-neutral-950 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-60">
          {changingPassword ? 'Updating…' : 'Change password'}
        </button>
      </form>
    </section>
  );
}

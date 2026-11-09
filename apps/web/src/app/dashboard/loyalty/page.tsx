'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Gift,
  Plus,
  Search,
  Sparkles,
  Award,
  Trash2,
  Power,
  ArrowLeft,
  Coins,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Ticket,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';

export default function LoyaltyManagementPage() {
  const [business, setBusiness] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pointsPerRupee, setPointsPerRupee] = useState(1);
  const [searchPhone, setSearchPhone] = useState('');
  const [customerLookup, setCustomerLookup] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const [rewardForm, setRewardForm] = useState({
    name: '',
    description: '',
    pointsCost: 100,
    rewardType: 'DISCOUNT',
  });
  const [savingReward, setSavingReward] = useState(false);
  const [rewardToDelete, setRewardToDelete] = useState<any | null>(null);

  const router = useRouter();
  const toast = useToast();
  const apiUrl = getApiUrl();

  const fetchData = async () => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      router.push('/auth/login');
      return;
    }

    try {
      const bizRes = await fetch(`${apiUrl}/api/v1/business`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (bizRes.status === 401) {
        router.push('/auth/login');
        return;
      }
      const bizList = await bizRes.json();
      if (bizList.length > 0) {
        const curBiz = bizList[0];
        setBusiness(curBiz);

        const progRes = await fetch(`${apiUrl}/api/v1/loyalty/program/${curBiz.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (progRes.ok) {
          const progData = await progRes.json();
          setProgram(progData);
          setPointsPerRupee(Number(progData.pointsPerRupee) || 1);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Network Error', 'Failed to load loyalty program.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSaveProgram = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setSavingProgram(true);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch(`${apiUrl}/api/v1/loyalty/program/${business.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: 'POINTS_PER_RUPEE',
          pointsPerRupee: Number(pointsPerRupee),
          expiryDays: 365,
        }),
      });
      if (!response.ok) throw new Error('Could not save loyalty rules');
      toast.success('Rules Saved', `Customers will earn ${pointsPerRupee * 100} points per ₹100 spent.`);
      await fetchData();
    } catch (err: any) {
      toast.error('Save Failed', err.message);
    } finally {
      setSavingProgram(false);
    }
  };

  const handleCreateReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setSavingReward(true);
    const token = localStorage.getItem('accessToken');

    try {
      const response = await fetch(
        `${apiUrl}/api/v1/loyalty/program/${business.id}/rewards`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...rewardForm,
            pointsCost: Number(rewardForm.pointsCost),
          }),
        },
      );
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Could not create reward offer');
      }
      toast.success('Reward Published', `"${rewardForm.name}" added to member offers.`);
      setRewardForm({ name: '', description: '', pointsCost: 100, rewardType: 'DISCOUNT' });
      await fetchData();
    } catch (err: any) {
      toast.error('Reward Error', err.message);
    } finally {
      setSavingReward(false);
    }
  };

  const toggleRewardActive = async (reward: any) => {
    if (!business) return;
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/loyalty/program/${business.id}/rewards/${reward.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ isActive: !reward.isActive }),
        },
      );
      if (!response.ok) throw new Error('Could not update reward status');
      toast.info(
        reward.isActive ? 'Offer Paused' : 'Offer Published',
        `"${reward.name}" is now ${reward.isActive ? 'hidden from diners' : 'available for redemption'}.`
      );
      await fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  const handleDeleteReward = async () => {
    if (!rewardToDelete || !business) return;
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/loyalty/program/${business.id}/rewards/${rewardToDelete.id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!response.ok) throw new Error('Could not delete reward');
      toast.success('Reward Deleted', `Removed "${rewardToDelete.name}".`);
      setRewardToDelete(null);
      await fetchData();
    } catch (err: any) {
      toast.error('Delete Failed', err.message);
    }
  };

  const handleSearchCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !searchPhone.trim()) return;
    setSearching(true);
    setCustomerLookup(null);

    try {
      const res = await fetch(
        `${apiUrl}/api/v1/loyalty/public/${business.slug}/${encodeURIComponent(searchPhone.trim())}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'No wallet found for this phone number');
      setCustomerLookup(data);
    } catch (err: any) {
      toast.warning('Not Found', err.message || 'No loyalty balance recorded for this number.');
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Loading loyalty program...</p>
        </div>
      </div>
    );
  }

  const rewards = program?.rewards || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-xs font-bold transition-colors bg-gray-100 px-3 py-1.5 rounded-xl"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <span className="text-gray-300">/</span>
          <div className="flex items-center gap-2">
            <Coins className="w-5 h-5 text-orange-600" />
            <h1 className="text-base font-extrabold text-gray-900">Loyalty Rewards &amp; Scratch Cards</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Banner with Explanation of Scratch Cards */}
        <div className="bg-gradient-to-r from-purple-700 via-indigo-700 to-purple-800 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-xs">
              <Sparkles className="w-4 h-4 text-purple-200" />
              <span>Gamified Guest Retention</span>
            </span>
            <h2 className="text-2xl font-black tracking-tight">Post-Order Scratch Card Rewards</h2>
            <p className="text-xs text-purple-100 max-w-xl leading-relaxed">
              When customers complete any order (dine-in or pre-order), they reveal an interactive scratch card on their phone earning loyalty points specifically for your restaurant. Points can be redeemed for your custom offers on their next visit!
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 text-center shrink-0 min-w-56 space-y-1.5">
            <span className="text-2xl block">🎁</span>
            <span className="text-xs font-extrabold uppercase tracking-wider text-purple-200 block">
              Automated Scratch Card
            </span>
            <p className="text-[11px] text-purple-100 font-semibold">
              Active for all completing diners
            </p>
          </div>
        </div>

        {/* Earning Rule Settings & Quick Lookup Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Points Rule Settings Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
                  Earn Rate Formula
                </span>
                <h3 className="text-lg font-black text-gray-900 mt-0.5">Points per ₹ Spend</h3>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full border border-emerald-200">
                Auto-crediting
              </span>
            </div>

            <form onSubmit={handleSaveProgram} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Points Credited per ₹100 Spent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={pointsPerRupee * 100}
                    onChange={(e) => setPointsPerRupee(Number(e.target.value) / 100)}
                    className="w-36 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-bold focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                  />
                  <span className="text-xs font-bold text-gray-500">Points earned</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Formula: A diner spending ₹500 automatically receives <strong>{(pointsPerRupee * 500).toFixed(0)} points</strong> on their phone.
                </p>
              </div>

              <button
                type="submit"
                disabled={savingProgram}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-98"
              >
                {savingProgram ? 'Saving Rules...' : 'Update Earning Rate'}
              </button>
            </form>
          </div>

          {/* Customer Balance Lookup Card */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Front Counter Tool
              </span>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">Customer Balance Lookup</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Quickly verify a diner's available loyalty points by mobile number.
              </p>
            </div>

            <form onSubmit={handleSearchCustomer} className="flex gap-2">
              <input
                type="tel"
                required
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              <button
                type="submit"
                disabled={searching}
                className="bg-gray-900 hover:bg-black text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shadow-xs flex items-center gap-1.5 shrink-0"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{searching ? 'Looking...' : 'Search'}</span>
              </button>
            </form>

            {customerLookup && (
              <div className="bg-orange-50/80 border border-orange-200 rounded-2xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Member</span>
                    <p className="text-xs font-extrabold text-gray-900">{searchPhone}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Available Balance</span>
                    <p className="text-xl font-black text-orange-600">{customerLookup.points} pts</p>
                  </div>
                </div>

                {customerLookup.transactions && customerLookup.transactions.length > 0 && (
                  <div className="pt-2 border-t border-orange-200/60 text-xs space-y-1">
                    <span className="text-[10px] font-bold text-gray-700 block">Recent Activity</span>
                    {customerLookup.transactions.slice(0, 3).map((t: any) => (
                      <div key={t.id} className="flex justify-between text-[11px] text-gray-600">
                        <span>{t.reason || 'Order reward'}</span>
                        <span className="font-bold text-emerald-700">+{t.points} pts</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Member Rewards Catalog */}
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-6">
          <div className="border-b border-gray-100 pb-4">
            <span className="text-xs font-bold uppercase tracking-wider text-orange-600">
              Redemption Catalog
            </span>
            <h3 className="text-lg font-black text-gray-900 mt-0.5">Manage Member Rewards ({rewards.length})</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Create offers diners can claim during their next visit using points they scratched.
            </p>
          </div>

          {/* Add Offer Form */}
          <form onSubmit={handleCreateReward} className="bg-gray-50 rounded-2xl p-4 border border-gray-200/60 space-y-3">
            <h4 className="font-bold text-xs uppercase tracking-wider text-gray-700">Add New Reward Offer</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                maxLength={80}
                value={rewardForm.name}
                onChange={(e) => setRewardForm({ ...rewardForm, name: e.target.value })}
                placeholder="Offer name (e.g. Free Starter)"
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
              />
              <input
                type="number"
                required
                min={1}
                max={100000}
                value={rewardForm.pointsCost}
                onChange={(e) => setRewardForm({ ...rewardForm, pointsCost: Number(e.target.value) })}
                placeholder="Points needed"
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
              />
              <select
                value={rewardForm.rewardType}
                onChange={(e) => setRewardForm({ ...rewardForm, rewardType: e.target.value })}
                className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
              >
                <option value="DISCOUNT">Bill Discount (₹ or %)</option>
                <option value="FREE_ITEM">Free Menu Item</option>
                <option value="OTHER">Custom Special Perk</option>
              </select>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                maxLength={200}
                value={rewardForm.description}
                onChange={(e) => setRewardForm({ ...rewardForm, description: e.target.value })}
                placeholder="Details or redemption note (e.g. Valid on any bill above ₹400)"
                className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
              />
              <button
                type="submit"
                disabled={savingReward}
                className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{savingReward ? 'Adding...' : 'Publish Reward'}</span>
              </button>
            </div>
          </form>

          {/* Active Rewards List */}
          {rewards.length === 0 ? (
            <EmptyState
              icon="🎁"
              title="No rewards configured yet"
              description="Add member offers above (e.g. Free Dessert for 150 points, ₹50 Off for 100 points) to give customers a compelling reason to revisit!"
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {rewards.map((reward: any) => (
                <div key={reward.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm text-gray-900">{reward.name}</h4>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                          reward.isActive
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            : 'bg-gray-100 text-gray-500 border-gray-200'
                        }`}
                      >
                        {reward.isActive ? 'Active Offer' : 'Paused'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {reward.description || 'Applicable on next dine-in visit'} · <strong className="text-orange-600 font-bold">{reward.pointsCost} points</strong> required
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleRewardActive(reward)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 ${
                        reward.isActive
                          ? 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                          : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                      <span>{reward.isActive ? 'Pause' : 'Activate'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setRewardToDelete(reward)}
                      className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete offer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Branded Confirm Modal for Deleting Reward */}
      <ConfirmModal
        isOpen={!!rewardToDelete}
        onClose={() => setRewardToDelete(null)}
        onConfirm={handleDeleteReward}
        title="Delete Loyalty Offer?"
        description={
          rewardToDelete
            ? `Are you sure you want to delete "${rewardToDelete.name}"? Diners will no longer be able to claim it.`
            : 'Are you sure you want to delete this offer?'
        }
        confirmLabel="Yes, Delete Offer"
        cancelLabel="Keep Offer"
        variant="danger"
      />
    </div>
  );
}

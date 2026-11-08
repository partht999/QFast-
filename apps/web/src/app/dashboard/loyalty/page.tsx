'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';

export default function LoyaltyManagementPage() {
  const [business, setBusiness] = useState<any>(null);
  const [program, setProgram] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pointsPerRupee, setPointsPerRupee] = useState(1);
  const [searchPhone, setSearchPhone] = useState('');
  const [customerLookup, setCustomerLookup] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [savingProgram, setSavingProgram] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const router = useRouter();

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
    setSaveSuccess(false);
    const token = localStorage.getItem('accessToken');

    try {
      await fetch(`${apiUrl}/api/v1/loyalty/program/${business.id}`, {
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
      setSaveSuccess(true);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSavingProgram(false);
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
      if (res.ok) {
        const data = await res.json();
        setCustomerLookup(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xl font-black text-brand-600">
            ⚡ Qfast
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-bold text-gray-800">Loyalty &amp; Stamp Cards</h1>
        </div>

        <Link
          href="/dashboard"
          className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
        >
          ← Overview
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 space-y-6">
        {/* Loyalty Program Settings */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-brand-600">
                Advanced Loyalty Engine
              </span>
              <h2 className="text-lg font-black text-gray-900 mt-0.5">
                Points per Rupee Configuration
              </h2>
            </div>
            <span className="text-xs bg-orange-100 text-brand-800 font-bold px-3 py-1 rounded-full">
              Active Program
            </span>
          </div>

          <form onSubmit={handleSaveProgram} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Points Earned per ₹100 Spent
              </label>
              <div className="flex items-center gap-2 max-w-xs">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={pointsPerRupee * 100}
                  onChange={(e) => setPointsPerRupee(Number(e.target.value) / 100)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                />
                <span className="text-xs font-semibold text-gray-500">Points</span>
              </div>
              <p className="text-[11px] text-gray-400 mt-1">
                Currently 1 ₹ spent = {pointsPerRupee} loyalty point.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingProgram}
                className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm"
              >
                {savingProgram ? 'Saving…' : 'Save Rules'}
              </button>
              {saveSuccess && (
                <span className="text-xs text-green-600 font-semibold">
                  ✓ Rules updated successfully
                </span>
              )}
            </div>
          </form>
        </div>

        {/* Customer Wallet Lookup */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div>
            <h3 className="font-extrabold text-base text-gray-900">Customer Wallet Lookup</h3>
            <p className="text-xs text-gray-400">Search diner loyalty balance by mobile number</p>
          </div>

          <form onSubmit={handleSearchCustomer} className="flex gap-2 max-w-md">
            <input
              type="tel"
              required
              value={searchPhone}
              onChange={(e) => setSearchPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-400 focus:outline-none"
            />
            <button
              type="submit"
              disabled={searching}
              className="bg-gray-900 hover:bg-black text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              {searching ? 'Looking up…' : 'Search 🔍'}
            </button>
          </form>

          {customerLookup && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-5 mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs text-gray-500 font-medium">Customer Mobile</span>
                  <p className="text-base font-bold text-gray-900">{searchPhone}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 font-medium">Loyalty Balance</span>
                  <p className="text-2xl font-black text-brand-600">
                    {customerLookup.points} pts
                  </p>
                </div>
              </div>

              {customerLookup.transactions?.length > 0 ? (
                <div className="pt-2 border-t border-orange-200 text-xs space-y-1">
                  <span className="font-bold text-gray-700 block mb-1">Recent Activity</span>
                  {customerLookup.transactions.map((t: any) => (
                    <div key={t.id} className="flex justify-between text-gray-600">
                      <span>{t.reason || 'Earned from order'}</span>
                      <span className="font-bold text-green-700">+{t.points} pts</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">No past transactions recorded yet.</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

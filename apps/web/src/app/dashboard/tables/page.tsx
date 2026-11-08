'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';

export default function TablesManagementPage() {
  const [business, setBusiness] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [tableForm, setTableForm] = useState({ name: '', capacity: 4 });
  const [submitting, setSubmitting] = useState(false);
  const [selectedTableForQR, setSelectedTableForQR] = useState<any>(null);
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

        const tablesRes = await fetch(`${apiUrl}/api/v1/tables/${curBiz.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          setTables(tablesData);
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

  const handleCreateTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !tableForm.name.trim()) return;
    setSubmitting(true);
    const token = localStorage.getItem('accessToken');

    try {
      await fetch(`${apiUrl}/api/v1/tables/${business.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: tableForm.name.trim(),
          capacity: Number(tableForm.capacity),
        }),
      });

      setTableForm({ name: '', capacity: 4 });
      setShowAddModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const entranceUrl = `${origin}/r/${business?.slug}/join`;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xl font-black text-brand-600">
            ⚡ Qfast
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-bold text-gray-800">Tables &amp; QR Manager</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Overview
          </Link>
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            + Add Table
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Entrance QR Banner */}
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-3xl p-6 text-white shadow-md flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs uppercase tracking-wider font-semibold opacity-80">
              Entrance QR Code
            </span>
            <h2 className="text-xl font-black mt-1">Live Queue &amp; Walk-in Scan</h2>
            <p className="text-xs opacity-90 mt-1 font-mono break-all">{entranceUrl}</p>
            <p className="text-sm mt-3 max-w-md">
              Customers can scan this code to open your restaurant’s queue page and join the waitlist.
            </p>
          </div>
          <div className="flex flex-col items-center gap-3 bg-white rounded-2xl p-4 text-center shrink-0">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                entranceUrl,
              )}`}
              alt={`Entrance queue QR code for ${business?.name || 'your restaurant'}`}
              className="w-44 h-44 rounded-lg"
            />
            <span className="text-xs font-bold text-gray-700">{business?.name}</span>
            <a
              href={entranceUrl}
              target="_blank"
              rel="noreferrer"
              className="bg-orange-500 text-white hover:bg-orange-600 text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm"
            >
              Test Queue Page
            </a>
          </div>
        </div>

        {/* Tables Floor Plan */}
        <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-base text-gray-900">
                Floor Tables ({tables.length})
              </h3>
              <p className="text-xs text-gray-400">
                Each table gets an automatic QR code linked to live ordering
              </p>
            </div>
          </div>

          {tables.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <span className="text-4xl block mb-2">🪑</span>
              <p className="font-bold text-gray-700">No tables configured yet</p>
              <p className="text-xs mt-1">Add tables to generate QR codes for contactless dining.</p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-4 bg-brand-500 text-white font-bold text-xs px-4 py-2 rounded-xl"
              >
                + Add Table 1
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tables.map((table) => {
                const isOccupied = table.orders?.length > 0;
                const tableUrl = `${origin}/r/${business?.slug}/table/${encodeURIComponent(table.name)}`;

                return (
                  <div
                    key={table.id}
                    className={`rounded-2xl p-5 border transition-all ${
                      isOccupied
                        ? 'border-orange-300 bg-orange-50/50'
                        : 'border-gray-200 bg-white hover:border-brand-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-lg font-black text-gray-900">{table.name}</span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                          isOccupied
                            ? 'bg-orange-200 text-orange-900'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {isOccupied ? 'Occupied 🍽️' : 'Available ✓'}
                      </span>
                    </div>

                    <p className="text-xs text-gray-500 mb-3">
                      Capacity: <span className="font-semibold text-gray-800">{table.capacity} guests</span>
                    </p>

                    {isOccupied && (
                      <div className="bg-white rounded-xl p-2.5 border border-orange-200 text-xs mb-3 space-y-1">
                        <span className="text-[10px] uppercase font-bold text-orange-600 block">
                          Active Dine-in Order
                        </span>
                        <div className="flex justify-between font-extrabold text-gray-900">
                          <span>Total</span>
                          <span>₹{Number(table.orders[0]?.totalAmount || 0).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                      <a
                        href={tableUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-bold text-brand-600 hover:underline"
                      >
                        Open QR Link ↗
                      </a>
                      <button
                        onClick={() => setSelectedTableForQR({ ...table, url: tableUrl })}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-2.5 py-1 rounded-lg transition-colors"
                      >
                        View QR
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Add Table Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-extrabold text-base text-gray-900 mb-3">Add Floor Table</h3>
            <form onSubmit={handleCreateTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Table Name / Number *
                </label>
                <input
                  type="text"
                  required
                  value={tableForm.name}
                  onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                  placeholder="e.g. Table 1 or T-04"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Guest Seating Capacity *
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={tableForm.capacity}
                  onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  Create Table &amp; QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View QR Code Modal */}
      {selectedTableForQR && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-base text-gray-900">
                {selectedTableForQR.name} — QR Code
              </h3>
              <button
                onClick={() => setSelectedTableForQR(null)}
                className="text-gray-400 hover:text-gray-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            {/* QR Image preview via quick QR API */}
            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center justify-center">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  selectedTableForQR.url,
                )}`}
                alt="Table QR"
                className="w-48 h-48 rounded-xl shadow-sm"
              />
              <span className="text-xs font-bold text-gray-700 mt-3">{business?.name}</span>
              <span className="text-xs text-brand-600 font-extrabold">{selectedTableForQR.name}</span>
            </div>

            <p className="text-xs text-gray-400 font-mono break-all">{selectedTableForQR.url}</p>

            <a
              href={selectedTableForQR.url}
              target="_blank"
              rel="noreferrer"
              className="block w-full bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-md"
            >
              Open Dine-in Ordering Page 📱
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

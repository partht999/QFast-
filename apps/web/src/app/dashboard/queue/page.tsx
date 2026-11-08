'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import {
  Users,
  Phone,
  Hash,
  Bell,
  Check,
  XCircle,
  UserPlus,
  Clock,
  ArrowRightLeft,
  SkipForward,
  ExternalLink,
  PartyPopper,
  RefreshCw,
  Armchair,
  X,
  StickyNote,
} from 'lucide-react';

export default function DashboardQueuePage() {
  const [business, setBusiness] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [queue, setQueue] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    customerName: '',
    customerPhone: '',
    partySize: 2,
    notes: '',
  });
  const [addingToken, setAddingToken] = useState(false);
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

        const qRes = await fetch(`${apiUrl}/api/v1/queue/manage/${curBiz.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (qRes.ok) {
          const qData = await qRes.json();
          setQueue(qData.queue);
          setTokens(qData.tokens || []);
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
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdateStatus = async (tokenId: string, action: 'call' | 'seat' | 'skip' | 'cancel') => {
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`${apiUrl}/api/v1/queue/manage/token/${tokenId}/${action}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleQueue = async () => {
    if (!queue) return;
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`${apiUrl}/api/v1/queue/manage/queue/${queue.id}/toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddWalkin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business) return;
    setAddingToken(true);

    try {
      await fetch(`${apiUrl}/api/v1/queue/public/${business.slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      });

      setShowAddModal(false);
      setAddForm({ customerName: '', customerPhone: '', partySize: 2, notes: '' });
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setAddingToken(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const waitingTokens = tokens.filter((t) => t.status === 'WAITING' || t.status === 'CALLED');
  const seatedTokens = tokens.filter((t) => t.status === 'SEATED');

  return (
    <section className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Queue Operations</h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor and manage your live queue in real time
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 active:scale-[0.98] text-white font-semibold text-sm px-5 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md"
        >
          <UserPlus className="w-4 h-4" />
          Add Walk-in Guest
        </button>
      </div>

      {/* Status Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{business?.name} — Live Queue</h2>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            Entrance QR:{' '}
            <a
              href={`/r/${business?.slug}/join`}
              target="_blank"
              rel="noreferrer"
              className="text-orange-600 hover:text-orange-700 hover:underline font-mono transition-colors"
            >
              /r/{business?.slug}/join
            </a>
          </p>
        </div>

        <button
          onClick={handleToggleQueue}
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all border active:scale-[0.98] ${
            queue?.isOpen
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
              : 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-full ${queue?.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {queue?.isOpen ? 'Queue is Open' : 'Queue is Closed'}
          <span className="text-xs opacity-60 ml-1">(Click to toggle)</span>
        </button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Waiting Guests</span>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{waitingTokens.length}</div>
            <span className="text-xs text-gray-400">parties in queue</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Seated Today</span>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{seatedTokens.length}</div>
            <span className="text-xs text-gray-400">successfully seated</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Est. Wait per Party</span>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">~8 min</div>
            <span className="text-xs text-gray-400">average turnover</span>
          </div>
        </div>
      </div>

      {/* Live Waiting List */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-bold text-base text-gray-900">
            Active Queue ({waitingTokens.length})
          </h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
            <RefreshCw className="w-3 h-3 animate-spin" style={{ animationDuration: '3s' }} />
            Auto-refreshing
          </span>
        </div>

        {waitingTokens.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <PartyPopper className="w-7 h-7 text-gray-400" />
            </div>
            <p className="font-semibold text-gray-700">No guests currently waiting</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
              New scans at the entrance QR will appear here in real time.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {waitingTokens.map((token, idx) => (
              <article
                key={token.id}
                className="rounded-xl border border-gray-100 hover:border-gray-200 bg-gray-50/50 hover:bg-gray-50 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex items-center gap-4">
                  {/* Avatar / Token Number */}
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                    <Hash className="w-3.5 h-3.5 opacity-70" />
                    {token.tokenNumber}
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-sm text-gray-900">{token.customerName}</h4>
                      <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                        <Users className="w-3 h-3" />
                        {token.partySize}
                      </span>
                      {token.status === 'CALLED' && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                          <Bell className="w-3 h-3" />
                          CALLED
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {token.customerPhone}
                      </span>
                      <span>Position #{idx + 1}</span>
                      {token.notes && (
                        <span className="inline-flex items-center gap-1 text-gray-500">
                          <StickyNote className="w-3 h-3" />
                          {token.notes}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    onClick={() => handleUpdateStatus(token.id, 'call')}
                    className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs px-3.5 py-2 rounded-lg border border-amber-200 transition-all active:scale-[0.97]"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Call
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(token.id, 'seat')}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm active:scale-[0.97]"
                  >
                    <Armchair className="w-3.5 h-3.5" />
                    Seat Guest
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(token.id, 'skip')}
                    className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-xs px-2.5 py-2 rounded-lg transition-all"
                  >
                    <SkipForward className="w-3.5 h-3.5" />
                    Skip
                  </button>
                  <button
                    onClick={() => handleUpdateStatus(token.id, 'cancel')}
                    className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 hover:bg-red-50 text-xs px-2.5 py-2 rounded-lg transition-all"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Add Walk-in Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">Add Walk-in Guest</h3>
                  <p className="text-xs text-gray-400">Generate a queue token manually</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddWalkin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Guest Name</label>
                <input
                  type="text"
                  required
                  value={addForm.customerName}
                  onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none transition-shadow"
                  placeholder="e.g. Vikram Singhania"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Mobile Number</label>
                <input
                  type="tel"
                  required
                  value={addForm.customerPhone}
                  onChange={(e) => setAddForm({ ...addForm, customerPhone: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none transition-shadow"
                  placeholder="+91 98765 43210"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Party Size</label>
                <input
                  type="number"
                  min="1"
                  max="20"
                  required
                  value={addForm.partySize}
                  onChange={(e) => setAddForm({ ...addForm, partySize: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none transition-shadow"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
                <input
                  type="text"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none transition-shadow"
                  placeholder="e.g. Needs high chair"
                />
              </div>

              <button
                type="submit"
                disabled={addingToken}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-all shadow-md hover:shadow-lg active:scale-[0.98] text-sm mt-2 inline-flex items-center justify-center gap-2"
              >
                {addingToken ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Generating Token…
                  </>
                ) : (
                  <>
                    <Hash className="w-4 h-4" />
                    Generate Queue Token
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}

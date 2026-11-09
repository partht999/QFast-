'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { getBusinessPublicPath, isFoodBusiness } from '@/lib/business-links';
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
  Copy,
  MapPin,
  Save,
} from 'lucide-react';

export default function DashboardQueuePage() {
  const [business, setBusiness] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [queue, setQueue] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTokenForSeat, setSelectedTokenForSeat] = useState<any | null>(null);
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    customerName: '',
    customerPhone: '',
    partySize: 2,
    notes: '',
  });
  const [addingToken, setAddingToken] = useState(false);
  const [actionError, setActionError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ averageWaitMinutes: 8, arrivalGraceMinutes: 10 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
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

        const [qRes, tablesRes] = await Promise.all([
          fetch(`${apiUrl}/api/v1/queue/manage/${curBiz.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/api/v1/tables/${curBiz.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (qRes.ok) {
          const qData = await qRes.json();
          setQueue(qData.queue);
          if (qData.queue && !settingsDirty) {
            setSettingsForm({
              averageWaitMinutes: qData.queue.averageWaitMinutes || 8,
              arrivalGraceMinutes: qData.queue.arrivalGraceMinutes || 10,
            });
          }
          setTokens(qData.tokens || []);
        }

        if (tablesRes.ok) {
          const tData = await tablesRes.json();
          setTables(tData || []);
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

  const handleArrive = async (tokenId: string) => {
    const authToken = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${apiUrl}/api/v1/queue/manage/token/${tokenId}/arrive`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || 'Could not check in guest');
      }
      setActionError('');
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not check in guest');
    }
  };

  const handleToggleRemote = async () => {
    if (!queue) return;
    const authToken = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${apiUrl}/api/v1/queue/manage/queue/${queue.id}/remote-toggle`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${authToken}` },
      });
      if (!response.ok) throw new Error('Could not update remote joining');
      setActionError('');
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update remote joining');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!queue) return;
    setSavingSettings(true);
    const authToken = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${apiUrl}/api/v1/queue/manage/queue/${queue.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(settingsForm),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || 'Could not save queue settings');
      }
      setActionError('');
      setSettingsDirty(false);
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save queue settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}${getBusinessPublicPath(business?.slug, business?.type)}`,
      );
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      setActionError('Could not copy the queue link. Copy it from the address bar instead.');
    }
  };

  const handleUpdateStatus = async (
    tokenId: string,
    action: 'call' | 'seat' | 'complete' | 'skip' | 'cancel',
    tableId?: string,
  ) => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${apiUrl}/api/v1/queue/manage/token/${tokenId}/${action}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ tableId }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || 'Could not update queue entry');
      }
      setActionError('');
      setSelectedTokenForSeat(null);
      setTargetTableId('');
      await fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not update queue entry');
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
      const authToken = localStorage.getItem('accessToken');
      const response = await fetch(`${apiUrl}/api/v1/queue/manage/${business.id}/walk-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          ...addForm,
          partySize: isFoodBusiness(business.type) ? addForm.partySize : 1,
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.message || 'Could not add walk-in guest');
      }

      setShowAddModal(false);
      setAddForm({ customerName: '', customerPhone: '', partySize: 2, notes: '' });
      setActionError('');
      fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add walk-in guest');
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
  const foodBusiness = isFoodBusiness(business?.type);
  const servedTokens = tokens.filter((t) => t.status === (foodBusiness ? 'SEATED' : 'COMPLETED'));
  const estimatedQueueWait = waitingTokens.length * (queue?.averageWaitMinutes || 8);

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
          Add Walk-in Customer
        </button>
      </div>

      {/* Status Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{business?.name} — Live Queue</h2>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
            <ExternalLink className="w-3 h-3" />
            Remote queue link:{' '}
            <a
              href={getBusinessPublicPath(business?.slug, business?.type)}
              target="_blank"
              rel="noreferrer"
              className="text-orange-600 hover:text-orange-700 hover:underline font-mono transition-colors"
            >
              {getBusinessPublicPath(business?.slug, business?.type)}
            </a>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 font-semibold text-orange-700 hover:bg-orange-100"
            >
              <Copy className="h-3 w-3" />
              {linkCopied ? 'Copied' : 'Copy remote link'}
            </button>
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
        <button
          type="button"
          onClick={() => void handleToggleRemote()}
          disabled={!queue}
          className={`inline-flex items-center gap-2 rounded-xl border px-5 py-2.5 text-sm font-semibold transition-all disabled:opacity-50 ${
            queue?.remoteJoinEnabled
              ? 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
              : 'border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${queue?.remoteJoinEnabled ? 'bg-blue-500' : 'bg-gray-400'}`} />
          Remote joining {queue?.remoteJoinEnabled ? 'On' : 'Off'}
        </button>
      </div>
      {actionError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <form
        onSubmit={handleSaveSettings}
        className="flex flex-col gap-4 rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1">
          <label htmlFor="average-wait" className="mb-1 block text-xs font-semibold text-gray-600">
            Estimated minutes per party
          </label>
          <input
            id="average-wait"
            type="number"
            min="1"
            max="60"
            required
            value={settingsForm.averageWaitMinutes}
            onChange={(e) => {
              setSettingsDirty(true);
              setSettingsForm((current) => ({
                ...current,
                averageWaitMinutes: Number(e.target.value),
              }));
            }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <div className="flex-1">
          <label htmlFor="arrival-grace" className="mb-1 block text-xs font-semibold text-gray-600">
            Arrival grace period after call (minutes)
          </label>
          <input
            id="arrival-grace"
            type="number"
            min="1"
            max="60"
            required
            value={settingsForm.arrivalGraceMinutes}
            onChange={(e) => {
              setSettingsDirty(true);
              setSettingsForm((current) => ({
                ...current,
                arrivalGraceMinutes: Number(e.target.value),
              }));
            }}
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={savingSettings || !queue}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {savingSettings ? 'Saving…' : 'Save settings'}
        </button>
      </form>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
            <Users className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Customers Waiting</span>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{waitingTokens.length}</div>
            <span className="text-xs text-gray-400">{foodBusiness ? 'parties in queue' : 'entries in queue'}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">{foodBusiness ? 'Seated Today' : 'Served Today'}</span>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{servedTokens.length}</div>
            <span className="text-xs text-gray-400">{foodBusiness ? 'successfully seated' : 'visits completed'}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">Estimated Queue Wait</span>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">~{estimatedQueueWait} min</div>
            <span className="text-xs text-gray-400">approx. {queue?.averageWaitMinutes || 8} min per {foodBusiness ? 'party' : 'customer'}</span>
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
            <p className="font-semibold text-gray-700">No customers currently waiting</p>
            <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
              New walk-ins and remote customers will appear here.
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
                      {foodBusiness && <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                        <Users className="w-3 h-3" />
                        {token.partySize}
                      </span>}
                      {token.status === 'CALLED' && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full animate-pulse">
                          <Bell className="w-3 h-3" />
                          CALLED
                        </span>
                      )}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        token.source === 'REMOTE'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {token.source === 'REMOTE' ? 'Remote' : 'Walk-in'}
                      </span>
                      {token.source === 'REMOTE' && token.onTheWayAt && !token.arrivedAt && (
                        <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-800">
                          On the way
                        </span>
                      )}
                      {token.arrivedAt && (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800">
                          Arrived
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {token.customerPhone}
                      </span>
                      <span>Position #{idx + 1}</span>
                      <span>Est. ~{token.estimatedWaitMin ?? idx * (queue?.averageWaitMinutes || 8)} min</span>
                      {token.status === 'CALLED' && token.arrivalDeadlineAt && !token.arrivedAt && (
                        <span className="font-semibold text-amber-700">
                          Arrive by {new Date(token.arrivalDeadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      )}
                      {token.orders && token.orders.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 text-[10px]">
                          🍳 Pre-order Placed ({token.orders.length})
                        </span>
                      )}
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
                    disabled={idx !== 0 || token.status !== 'WAITING'}
                    className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 font-semibold text-xs px-3.5 py-2 rounded-lg border border-amber-200 transition-all active:scale-[0.97]"
                  >
                    <Bell className="w-3.5 h-3.5" />
                    Call
                  </button>
                  {token.source === 'REMOTE' && token.status === 'CALLED' && !token.arrivedAt && (
                    <button
                      onClick={() => handleArrive(token.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      Mark arrived
                    </button>
                  )}
                  {token.status === 'CALLED' && (
                    <button
                      onClick={() => {
                        if (foodBusiness && tables.length > 0) {
                          setSelectedTokenForSeat(token);
                          setTargetTableId(tables[0]?.id || '');
                        } else {
                          handleUpdateStatus(token.id, foodBusiness ? 'seat' : 'complete');
                        }
                      }}
                      className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm active:scale-[0.97]"
                    >
                      {foodBusiness && <Armchair className="w-3.5 h-3.5" />}
                      {foodBusiness ? 'Seat Customer' : 'Complete Service'}
                    </button>
                  )}
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
                  <h3 className="font-bold text-base text-gray-900">Add Walk-in Customer</h3>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Customer Name</label>
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

              {foodBusiness && <div>
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
              </div>}

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
      {/* Table Assignment Modal for Seating */}
      {selectedTokenForSeat && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Armchair className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">
                    Seat Party #{selectedTokenForSeat.tokenNumber}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {selectedTokenForSeat.customerName} ({selectedTokenForSeat.partySize} guests)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTokenForSeat(null)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedTokenForSeat.orders && selectedTokenForSeat.orders.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900">
                <span className="font-bold block mb-0.5">🍳 Active Pre-order Detected</span>
                Assigning a table will automatically transfer their pre-order to that table on KDS and update the guest's tracker screen!
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Select Available Dining Table
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {tables.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTargetTableId(t.id)}
                    className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center ${
                      targetTableId === t.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                        : 'border-gray-200 text-gray-700 bg-white hover:border-gray-300'
                    }`}
                  >
                    <span className="block truncate">{t.name}</span>
                    <span className="text-[10px] text-gray-400 font-normal">Cap: {t.capacity}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedTokenForSeat.id, 'seat', targetTableId || undefined)}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Armchair className="w-4 h-4" />
                <span>
                  {targetTableId
                    ? `Seat at ${tables.find((t) => t.id === targetTableId)?.name || 'Selected Table'}`
                    : 'Confirm Seating'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedTokenForSeat.id, 'seat')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 rounded-xl text-xs transition-colors"
              >
                Seat without specific table
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

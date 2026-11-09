'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { readApiError } from '@/lib/read-api-error';
import { getBusinessPublicPath, isFoodBusiness } from '@/lib/business-links';
import { queueDisplayDetail, queueDisplayName, queueLanguage } from '@/lib/queue-language';
import {
  Users,
  Phone,
  Hash,
  Bell,
  Check,
  XCircle,
  UserPlus,
  Clock,
  SkipForward,
  RefreshCw,
  Armchair,
  X,
  StickyNote,
  Copy,
  MapPin,
  Save,
  Search,
  Plus,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';

export default function DashboardQueuePage() {
  const [business, setBusiness] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [queue, setQueue] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTokenForSeat, setSelectedTokenForSeat] = useState<any | null>(null);
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [tokenToCancel, setTokenToCancel] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'WAITING' | 'CALLED' | 'PREORDER' | 'REMOTE' | 'SKIPPED'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreateQueueModal, setShowCreateQueueModal] = useState(false);
  const [newQueueForm, setNewQueueForm] = useState({
    name: '',
    department: '',
    doctorName: '',
    serviceName: '',
    averageWaitMinutes: 10,
  });
  const [creatingQueue, setCreatingQueue] = useState(false);
  const [addForm, setAddForm] = useState({
    customerName: '',
    customerPhone: '',
    partySize: 2,
    notes: '',
    queueId: '',
  });
  const [addingToken, setAddingToken] = useState(false);
  const [actionError, setActionError] = useState('');
  const [linkCopied, setLinkCopied] = useState(false);
  const [settingsForm, setSettingsForm] = useState({ averageWaitMinutes: 8, arrivalGraceMinutes: 10 });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsDirty, setSettingsDirty] = useState(false);
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

        const qParam = selectedQueueId ? `?queueId=${selectedQueueId}` : '';
        const [qRes, tablesRes] = await Promise.all([
          fetch(`${apiUrl}/api/v1/queue/manage/${curBiz.id}${qParam}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/api/v1/tables/${curBiz.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (qRes.ok) {
          const qData = await qRes.json();
          setQueues(qData.queues || []);
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
      toast.success(
        'They are here',
        isFoodBusiness(business?.type) ? 'You can seat this party now.' : 'You can finish this visit now.',
      );
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not check in guest';
      setActionError(msg);
      toast.error('Check-in failed', msg);
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

  const playChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {}
  };

  const handleUpdateStatus = async (
    tokenId: string,
    action: 'call' | 'seat' | 'complete' | 'skip' | 'cancel' | 'restore',
    tableId?: string,
  ) => {
    const token = localStorage.getItem('accessToken');
    try {
      if (action === 'call') {
        playChime();
      }
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
      setTokenToCancel(null);

      const copy = queueLanguage(business?.type);
      const actionLabels = {
        call: 'Called',
        seat: 'Seated at a table',
        complete: 'Visit finished',
        skip: 'Skipped',
        cancel: 'Removed from the line',
        restore: 'Put back in line',
      };
      toast.success(actionLabels[action] || 'Updated', copy.pageHint);
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update queue entry';
      setActionError(msg);
      toast.error('Action failed', msg);
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
      setAddForm({ customerName: '', customerPhone: '', partySize: 2, notes: '', queueId: '' });
      setActionError('');
      fetchData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not add walk-in guest');
    } finally {
      setAddingToken(false);
    }
  };

  const handleCreateQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !newQueueForm.name.trim()) return;
    setCreatingQueue(true);

    try {
      const authToken = localStorage.getItem('accessToken');
      const response = await fetch(`${apiUrl}/api/v1/queue/manage/${business.id}/queues`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          name: newQueueForm.name,
          averageWaitMinutes: newQueueForm.averageWaitMinutes,
          ...(queueLanguage(business.type).showStaff ? { doctorName: newQueueForm.doctorName } : {}),
          ...(queueLanguage(business.type).showDepartment ? { department: newQueueForm.department } : {}),
        }),
      });
      if (!response.ok) {
        const body = await response.json();
        throw new Error(readApiError(body, 'Could not create queue'));
      }

      const created = await response.json();
      toast.success('Line added', `"${created.name}" is ready.`);
      setShowCreateQueueModal(false);
      setNewQueueForm({ name: '', department: '', doctorName: '', serviceName: '', averageWaitMinutes: 10 });
      setSelectedQueueId(created.id);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not create queue';
      setActionError(msg);
      toast.error('Failed to create queue', msg);
    } finally {
      setCreatingQueue(false);
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
  const skippedTokens = tokens.filter((t) => t.status === 'SKIPPED' || t.status === 'CANCELLED');
  const foodBusiness = isFoodBusiness(business?.type);
  const copy = queueLanguage(business?.type);
  const earliestWaitingId = waitingTokens.find((token) => token.status === 'WAITING')?.id;
  const servedTokens = tokens.filter((t) => t.status === 'SEATED' || t.status === 'COMPLETED');
  const estimatedQueueWait = waitingTokens.length * (queue?.averageWaitMinutes || 8);

  const currentServingToken = waitingTokens.find((t) => t.status === 'CALLED') || null;
  const nextInLineToken = waitingTokens.find((t) => t.status === 'WAITING') || null;

  const calledCount = waitingTokens.filter((t) => t.status === 'CALLED').length;
  const preorderCount = waitingTokens.filter((t) => t.orders && t.orders.length > 0).length;
  const remoteCount = waitingTokens.filter((t) => t.source === 'REMOTE').length;

  const baseTokens = activeFilter === 'SKIPPED' ? skippedTokens : waitingTokens;
  const filteredTokens = baseTokens.filter((token) => {
    if (activeFilter === 'CALLED' && token.status !== 'CALLED') return false;
    if (activeFilter === 'WAITING' && token.status !== 'WAITING') return false;
    if (activeFilter === 'REMOTE' && token.source !== 'REMOTE') return false;
    if (activeFilter === 'PREORDER' && (!token.orders || token.orders.length === 0)) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchName = token.customerName?.toLowerCase().includes(q);
      const matchPhone = token.customerPhone?.includes(q);
      const matchToken = String(token.tokenNumber).includes(q);
      if (!matchName && !matchPhone && !matchToken) return false;
    }
    return true;
  });

  return (
    <section className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">{copy.pageTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">{copy.pageHint}</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-orange-600 active:scale-[0.98]"
        >
          <UserPlus className="h-4 w-4" />
          {copy.addButton}
        </button>
      </div>

      <ol className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {copy.steps.map((step, index) => (
          <li key={step} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
              {index + 1}
            </span>
            <span className="text-sm font-medium text-gray-800">{step}</span>
          </li>
        ))}
      </ol>

      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {queues.map((q) => {
          const isSelected = selectedQueueId === q.id || (!selectedQueueId && queue?.id === q.id);
          const detail = queueDisplayDetail(q, business?.type);
          if (queues.length < 2) return null;
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setSelectedQueueId(q.id)}
              className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-xs font-bold transition ${
                isSelected ? 'bg-neutral-900 text-white shadow-sm' : 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="block">{queueDisplayName(q, business?.type)}</span>
              {detail && <span className={`mt-0.5 block font-medium ${isSelected ? 'text-white/70' : 'text-gray-400'}`}>{detail}</span>}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setShowCreateQueueModal(true)}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-dashed border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 hover:border-orange-300 hover:text-orange-700"
        >
          <Plus className="h-3.5 w-3.5" />
          {copy.addLine}
        </button>
      </div>

      {/* Status Bar */}
      <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">{business?.name}</h2>
          <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
            {copy.guestLink}:{' '}
            <a
              href={getBusinessPublicPath(business?.slug, business?.type)}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-orange-600 transition-colors hover:text-orange-700 hover:underline"
            >
              {getBusinessPublicPath(business?.slug, business?.type)}
            </a>
            <button
              type="button"
              onClick={() => void handleCopyLink()}
              className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-1 font-semibold text-orange-700 hover:bg-orange-100"
            >
              <Copy className="h-3 w-3" />
              {linkCopied ? 'Copied' : 'Copy link'}
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
          {queue?.isOpen ? copy.open : copy.closed}
          <span className="ml-1 text-xs opacity-60">(tap to change)</span>
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
          {queue?.remoteJoinEnabled ? copy.phoneOn : copy.phoneOff}
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
            {copy.waitSetting}
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
          <p className="mt-1 text-[11px] text-gray-400">{copy.waitHint}</p>
        </div>
        <div className="flex-1">
          <label htmlFor="arrival-grace" className="mb-1 block text-xs font-semibold text-gray-600">
            {copy.graceSetting}
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
          <p className="mt-1 text-[11px] text-gray-400">{copy.graceHint}</p>
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
            <span className="text-xs font-medium text-gray-500">{copy.waitingStat}</span>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{waitingTokens.length}</div>
            <span className="text-xs text-gray-400">{copy.waitingHint}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
            <Check className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">{copy.doneStat}</span>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">{servedTokens.length}</div>
            <span className="text-xs text-gray-400">{copy.doneHint}</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 border border-gray-200/80 shadow-sm flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <span className="text-xs font-medium text-gray-500">About how long</span>
            <div className="text-2xl font-bold text-gray-900 mt-0.5">~{estimatedQueueWait} min</div>
            <span className="text-xs text-gray-400">about {queue?.averageWaitMinutes || 8} min for each {copy.peopleNoun === 'parties' ? 'party' : 'person'}</span>
          </div>
        </div>
      </div>

      {/* ── Dominant Counter Operations Panel (Now Serving & Call Next) ── */}
      <div className="rounded-3xl border-2 border-orange-400/90 bg-gradient-to-br from-orange-50/70 via-white to-amber-50/60 p-6 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-md ${
              currentServingToken ? 'bg-orange-500 animate-pulse' : 'bg-neutral-800'
            }`}>
              {currentServingToken ? `#${currentServingToken.tokenNumber}` : '—'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-orange-100 text-orange-800">
                  {currentServingToken ? copy.nowLabel : copy.readyLabel}
                </span>
                {currentServingToken?.source === 'REMOTE' && (
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                    {copy.remote}
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black text-neutral-900 mt-1">
                {currentServingToken
                  ? currentServingToken.customerName
                  : nextInLineToken
                  ? `${copy.nextPrefix}: #${nextInLineToken.tokenNumber} ${nextInLineToken.customerName}`
                  : copy.emptyNow}
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5 flex items-center gap-2">
                {currentServingToken ? (
                  <>
                    <span>Phone: {currentServingToken.customerPhone}</span>
                    {foodBusiness && (
                      <>
                        <span>•</span>
                        <span>Party: {currentServingToken.partySize}</span>
                      </>
                    )}
                    {copy.showStaff && currentServingToken.doctorName && (
                      <>
                        <span>•</span>
                        <span className="font-semibold text-neutral-700">{currentServingToken.doctorName}</span>
                      </>
                    )}
                  </>
                ) : (
                  <span>{copy.readyDetail}</span>
                )}
              </p>
            </div>
          </div>

          {/* Quick Counter Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {currentServingToken ? (
              <>
                <button
                  type="button"
                  onClick={() => handleUpdateStatus(currentServingToken.id, 'call')}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 transition active:scale-98"
                >
                  <Bell className="w-4 h-4" />
                  <span>{copy.recall}</span>
                </button>

                {foodBusiness ? (
                  <button
                    type="button"
                    onClick={() => setSelectedTokenForSeat(currentServingToken)}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition active:scale-98"
                  >
                    <Armchair className="w-4 h-4" />
                    <span>{copy.finish}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleUpdateStatus(currentServingToken.id, 'complete')}
                    className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition active:scale-98"
                  >
                    <Check className="w-4 h-4" />
                    <span>{copy.finish}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleUpdateStatus(currentServingToken.id, 'skip')}
                  className="px-3.5 py-2.5 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-700 font-bold text-xs transition"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                  <span>Skip</span>
                </button>
              </>
            ) : nextInLineToken ? (
              <button
                type="button"
                onClick={() => handleUpdateStatus(nextInLineToken.id, 'call')}
                className="px-6 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-sm shadow-md flex items-center gap-2 transition active:scale-98"
              >
                <Bell className="w-4 h-4" />
                <span>{copy.callNext(nextInLineToken.tokenNumber)}</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Live Waiting List Card */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-gray-100">
          <div>
            <h3 className="font-bold text-base text-gray-900 flex items-center gap-2">
              <span>{copy.listTitle} ({waitingTokens.length})</span>
              {filteredTokens.length !== waitingTokens.length && (
                <span className="text-xs font-semibold text-gray-400 font-normal">
                  (Showing {filteredTokens.length})
                </span>
              )}
            </h3>
            <p className="text-xs text-gray-500">{copy.listHint}</p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-50 px-2.5 py-1.5 rounded-lg border border-gray-200/60">
              <RefreshCw className="w-3 h-3 animate-spin text-orange-500" style={{ animationDuration: '3s' }} />
              Auto-sync 3s
            </span>
          </div>
        </div>

        {/* Search Bar & Filter Tabs */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, phone, or number"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
            {[
              { id: 'ALL', label: `All (${waitingTokens.length})` },
              { id: 'WAITING', label: 'Waiting' },
              { id: 'CALLED', label: `Called (${calledCount})` },
              ...(foodBusiness ? [{ id: 'PREORDER', label: `${copy.ordered} (${preorderCount})` }] : []),
              { id: 'REMOTE', label: `${copy.remote} (${remoteCount})` },
              { id: 'SKIPPED', label: `Skipped (${skippedTokens.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  activeFilter === tab.id
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {baseTokens.length === 0 ? (
          activeFilter === 'SKIPPED' ? (
            <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
              <Check className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-gray-700">{copy.skippedEmpty}</p>
              <p className="text-xs text-gray-400 mt-0.5">{copy.skippedHint}</p>
            </div>
          ) : (
            <EmptyState
              emoji="🎉"
              title={copy.emptyTitle}
              description={copy.emptyBody}
              tip="The entrance QR is the easiest way for someone to take a number."
              actionLabel={copy.addButton}
              onAction={() => setShowAddModal(true)}
              className="py-12"
            />
          )
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
            <Search className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs font-bold text-gray-700">Nothing matches that search</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setActiveFilter('ALL');
              }}
              className="mt-2 text-xs font-bold text-orange-600 hover:underline"
            >
              Reset filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTokens.map((token, idx) => (
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
                      {foodBusiness && (
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-600 font-medium px-2 py-0.5 rounded-full">
                          <Users className="w-3 h-3" />
                          {token.partySize} guests
                        </span>
                      )}
                      {foodBusiness && token.table && (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-800 font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                          {token.table.name}
                        </span>
                      )}
                      {token.status === 'CALLED' && (
                        <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full animate-pulse border border-amber-300">
                          <Bell className="w-3 h-3" />
                          CALLED
                        </span>
                      )}
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          token.source === 'REMOTE'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {token.source === 'REMOTE' ? copy.remote : copy.walkIn}
                      </span>
                      {token.source === 'REMOTE' && token.onTheWayAt && !token.arrivedAt && (
                        <span className="rounded-full bg-cyan-100 px-2.5 py-0.5 text-xs font-bold text-cyan-800 border border-cyan-200">
                          {copy.onTheWay}
                        </span>
                      )}
                      {token.arrivedAt && (
                        <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-800 border border-green-200">
                          {copy.arrived}
                        </span>
                      )}
                      {foodBusiness && token.orders && token.orders.length > 0 && (
                        <span className="inline-flex items-center gap-1 text-amber-800 font-bold bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300 text-[10px]">
                          {copy.ordered} ({token.orders.length})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1 flex-wrap">
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
                      {token.notes && (
                        <span className="inline-flex items-center gap-1 text-gray-500 italic">
                          <StickyNote className="w-3 h-3" />
                          "{token.notes}"
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {/* Skipped or Cancelled token restoration */}
                  {token.status === 'SKIPPED' || token.status === 'CANCELLED' ? (
                    <>
                      <button
                        onClick={() => handleUpdateStatus(token.id, 'restore')}
                        className="inline-flex items-center gap-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs px-3.5 py-2 rounded-lg border border-blue-200 transition-all active:scale-[0.97]"
                        title="Restore customer back to waiting line"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Put back in line
                      </button>
                      <button
                        onClick={() => handleUpdateStatus(token.id, 'call')}
                        className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-2 rounded-lg transition-all shadow-xs active:scale-[0.97]"
                        title="Call guest forward now"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        Call now
                      </button>
                    </>
                  ) : (
                    <>
                      {/* WAITING or CALLED tokens */}
                      {token.status === 'CALLED' ? (
                        <button
                          onClick={() => handleUpdateStatus(token.id, 'call')}
                          title="Buzz / Alert customer again"
                          className="inline-flex items-center gap-1.5 bg-amber-100 hover:bg-amber-200 text-amber-900 font-bold text-xs px-3.5 py-2 rounded-lg border border-amber-300 transition-all active:scale-[0.97]"
                        >
                          <Bell className="w-3.5 h-3.5 animate-bounce text-amber-600" />
                          {copy.recall}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateStatus(token.id, 'call')}
                          disabled={token.id !== earliestWaitingId}
                          title={token.id !== earliestWaitingId ? 'Call the person at the front of the line first' : 'Call this person'}
                          className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 disabled:opacity-40 disabled:cursor-not-allowed text-amber-700 font-semibold text-xs px-3.5 py-2 rounded-lg border border-amber-200 transition-all active:scale-[0.97]"
                        >
                          <Bell className="w-3.5 h-3.5" />
                          Call
                        </button>
                      )}

                      {token.source === 'REMOTE' && token.status === 'CALLED' && !token.arrivedAt && (
                        <button
                          onClick={() => handleArrive(token.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-xs font-semibold text-cyan-800 hover:bg-cyan-100"
                        >
                          <MapPin className="h-3.5 w-3.5" />
                          They're here
                        </button>
                      )}

                      {token.status === 'CALLED' && (
                        <button
                          onClick={() => handleUpdateStatus(token.id, 'complete')}
                          className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-lg transition-all shadow-sm active:scale-[0.97]"
                        >
                          {foodBusiness && <Armchair className="w-3.5 h-3.5" />}
                          {copy.finish}
                        </button>
                      )}

                      <button
                        onClick={() => handleUpdateStatus(token.id, 'skip')}
                        className="inline-flex items-center gap-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 text-xs px-2.5 py-2 rounded-lg transition-all"
                        title="Temporarily skip guest"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        Skip
                      </button>

                      <button
                        onClick={() => setTokenToCancel(token)}
                        className="inline-flex items-center gap-1 text-gray-400 hover:text-red-600 hover:bg-red-50 text-xs px-2.5 py-2 rounded-lg transition-all"
                        title="Cancel token"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Cancel
                      </button>
                    </>
                  )}
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
                  <h3 className="font-bold text-base text-gray-900">{copy.addTitle}</h3>
                  <p className="text-xs text-gray-400">{copy.addHint}</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">{copy.nameLabel}</label>
                <input
                  type="text"
                  required
                  value={addForm.customerName}
                  onChange={(e) => setAddForm({ ...addForm, customerName: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none transition-shadow"
                  placeholder={copy.namePlaceholder}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone</label>
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
                <label className="block text-sm font-medium text-gray-700 mb-1.5">How many people</label>
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

              {queues.length > 1 && (
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-700">{copy.assignLabel}</label>
                  <select
                    value={addForm.queueId || queue?.id || ''}
                    onChange={(e) => setAddForm({ ...addForm, queueId: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm transition-shadow focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    {queues.map((q) => (
                      <option key={q.id} value={q.id}>
                        {queueDisplayName(q, business?.type)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (Optional)</label>
                <input
                  type="text"
                  value={addForm.notes}
                  onChange={(e) => setAddForm({ ...addForm, notes: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none transition-shadow"
                  placeholder={copy.notesPlaceholder}
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
                    Adding…
                  </>
                ) : (
                  <>
                    <Hash className="w-4 h-4" />
                    {copy.generate}
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
      {/* Create New Queue / Counter Modal */}
      {showCreateQueueModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900">{copy.addLineTitle}</h3>
                  <p className="text-xs text-gray-400">{copy.addLineHint}</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateQueueModal(false)}
                className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateQueue} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{copy.lineName}</label>
                <input
                  type="text"
                  required
                  value={newQueueForm.name}
                  onChange={(e) => setNewQueueForm({ ...newQueueForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none"
                  placeholder={copy.lineNamePlaceholder}
                />
              </div>

              {copy.showStaff && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{copy.staffLabel}</label>
                <input
                  type="text"
                  value={newQueueForm.doctorName}
                  onChange={(e) => setNewQueueForm({ ...newQueueForm, doctorName: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none"
                  placeholder={copy.staffPlaceholder}
                />
              </div>
              )}

              {copy.showDepartment && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{copy.departmentLabel}</label>
                <input
                  type="text"
                  value={newQueueForm.department}
                  onChange={(e) => setNewQueueForm({ ...newQueueForm, department: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none"
                  placeholder={copy.departmentPlaceholder}
                />
              </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{copy.waitPerLabel}</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  required
                  value={newQueueForm.averageWaitMinutes}
                  onChange={(e) => setNewQueueForm({ ...newQueueForm, averageWaitMinutes: Number(e.target.value) })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400 focus:outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={creatingQueue}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition shadow-md text-sm mt-2"
              >
                {creatingQueue ? 'Adding…' : copy.addLine}
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
                <span className="mb-0.5 block font-bold">They already ordered</span>
                Seating them moves that order to the table in the kitchen.
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Choose a table
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
                    ? `Seat at ${tables.find((t) => t.id === targetTableId)?.name || 'this table'}`
                    : 'Seat them'}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus(selectedTokenForSeat.id, 'seat')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 rounded-xl text-xs transition-colors"
              >
                Seat without choosing a table
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branded Confirm Modal for Token Cancellation */}
      <ConfirmModal
        isOpen={!!tokenToCancel}
        onClose={() => setTokenToCancel(null)}
        onConfirm={async () => {
          if (tokenToCancel) {
            const id = tokenToCancel.id;
            setTokenToCancel(null);
            await handleUpdateStatus(id, 'cancel');
          }
        }}
        title="Remove this number?"
        description={
          tokenToCancel
            ? `Remove #${tokenToCancel.tokenNumber} for ${tokenToCancel.customerName} from the line?`
            : 'Remove this number from the line?'
        }
        confirmLabel="Remove"
        cancelLabel="Keep them"
        variant="danger"
      />
    </section>
  );
}

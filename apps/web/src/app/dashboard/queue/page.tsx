'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getApiUrl } from '@/lib/api';
import { readApiError } from '@/lib/read-api-error';
import { getBusinessPublicPath, isFoodBusiness } from '@/lib/business-links';
import { queueDisplayName, queueLanguage } from '@/lib/queue-language';
import {
  Hash,
  Bell,
  Check,
  UserPlus,
  Clock,
  SkipForward,
  Armchair,
  X,
  Copy,
  MapPin,
  Save,
  Search,
  Plus,
} from 'lucide-react';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function DashboardQueuePage() {
  const [business, setBusiness] = useState<any>(null);
  const [tokens, setTokens] = useState<any[]>([]);
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [queue, setQueue] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTokenForSeat, setSelectedTokenForSeat] = useState<any | null>(null);
  const [assignMode, setAssignMode] = useState<'call' | 'seat'>('seat');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [targetTableId, setTargetTableId] = useState<string>('');
  const [pending, setPending] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    cancelLabel?: string;
    variant: 'danger' | 'warning' | 'primary';
    run: () => void | Promise<void>;
  } | null>(null);
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
          setAlerts(qData.alerts || []);
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
    allowWithoutTable?: boolean,
  ) => {
    const token = localStorage.getItem('accessToken');
    const party = tokens.find((entry) => entry.id === tokenId);
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
        body: JSON.stringify({ tableId, allowWithoutTable }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = readApiError(body, 'Could not update queue entry');
        if (action === 'call' && message.includes('Choose a table') && party) {
          setAssignMode('call');
          setTargetTableId('');
          setSelectedTokenForSeat(party);
          return;
        }
        throw new Error(message);
      }
      setActionError('');
      setSelectedTokenForSeat(null);
      setTargetTableId('');

      if (action === 'call' && body.table?.name) {
        toast.success('Called', `Table ${body.table.name} is theirs.`);
      } else if (action === 'call') {
        toast.success('Called', 'No table yet. Seat them when one is free.');
      } else if (action === 'seat') {
        toast.success('Seated', body.table?.name ? `They are at ${body.table.name}.` : 'Seated without a table.');
      } else if (action === 'complete') {
        toast.success('Bill closed', 'They can see and download the bill on their phone.');
      } else {
        const actionLabels = {
          skip: 'Skipped',
          cancel: 'Removed from the line',
          restore: 'Put back in line',
        };
        toast.success(actionLabels[action] || 'Updated', queueLanguage(business?.type).pageHint);
      }
      await fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not update queue entry';
      setActionError(msg);
      toast.error('Action failed', msg);
    }
  };

  const handleMarkPaid = async (tokenId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${apiUrl}/api/v1/queue/manage/token/${tokenId}/pay`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(readApiError(body, 'Could not mark the bill paid'));
      toast.success('Bill paid', 'You can close the visit when you are ready.');
      await fetchData();
    } catch (err) {
      toast.error('Payment not taken', err instanceof Error ? err.message : 'Could not mark the bill paid');
    }
  };

  const dismissAlert = async (alertId: string) => {
    const token = localStorage.getItem('accessToken');
    await fetch(`${apiUrl}/api/v1/queue/manage/alert/${alertId}/dismiss`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    setAlerts((current) => current.filter((alert) => alert.id !== alertId));
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
  const servedTokens = tokens.filter((t) => t.status === 'COMPLETED');

  const currentServingToken = waitingTokens.find((t) => t.status === 'CALLED') || null;
  const nextInLineToken = waitingTokens.find((t) => t.status === 'WAITING') || null;

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

  const featuredId = currentServingToken?.id || nextInLineToken?.id;
  const lineTokens = activeFilter === 'SKIPPED'
    ? filteredTokens
    : filteredTokens.filter((token) => token.id !== featuredId);

  return (
    <section className="mx-auto max-w-3xl space-y-5 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">{copy.pageTitle}</h1>
          <p className="mt-1 text-sm text-gray-500">
            {waitingTokens.length} waiting
            <span className="mx-1.5 text-gray-300">·</span>
            {servedTokens.length} done today
            <span className="mx-1.5 text-gray-300">·</span>
            about {queue?.averageWaitMinutes || 8} min each
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          <UserPlus className="h-4 w-4" />
          {copy.addButton}
        </button>
      </div>

      {queues.length > 1 && (
        <label className="flex items-center gap-2 text-sm font-medium text-gray-600">
          Line
          <select
            value={selectedQueueId || queue?.id || ''}
            onChange={(e) => setSelectedQueueId(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-900"
          >
            {queues.map((q) => (
              <option key={q.id} value={q.id}>
                {queueDisplayName(q, business?.type)}
              </option>
            ))}
          </select>
        </label>
      )}

      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert) => (
            <div key={alert.id} className="flex items-start justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-amber-950">{alert.subject}</p>
                <p className="text-sm text-amber-900">{alert.body}</p>
              </div>
              <button type="button" onClick={() => void dismissAlert(alert.id)} className="text-sm font-semibold text-amber-800">
                Done
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() =>
            setPending({
              title: queue?.isOpen ? 'Close the line?' : 'Open the line?',
              description: queue?.isOpen
                ? 'People will not be able to join until you open it again.'
                : 'People can take a number again.',
              confirmLabel: queue?.isOpen ? 'Close the line' : 'Open the line',
              variant: queue?.isOpen ? 'warning' : 'primary',
              run: () => handleToggleQueue(),
            })
          }
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold ${
            queue?.isOpen
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          <span className={`h-2 w-2 rounded-full ${queue?.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
          {queue?.isOpen ? 'Open' : 'Closed'}
        </button>
        <button
          type="button"
          onClick={() =>
            setPending({
              title: queue?.remoteJoinEnabled ? 'Turn off phone join?' : 'Allow phone join?',
              description: queue?.remoteJoinEnabled
                ? 'People can still be added here, but they cannot join from their phone.'
                : 'People can take a number from the join link.',
              confirmLabel: queue?.remoteJoinEnabled ? 'Turn it off' : 'Turn it on',
              variant: queue?.remoteJoinEnabled ? 'warning' : 'primary',
              run: () => handleToggleRemote(),
            })
          }
          disabled={!queue}
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-semibold disabled:opacity-50 ${
            queue?.remoteJoinEnabled
              ? 'border-blue-200 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-600'
          }`}
        >
          {queue?.remoteJoinEnabled ? 'Phone join on' : 'Phone join off'}
        </button>
        <button
          type="button"
          onClick={() => void handleCopyLink()}
          className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <Copy className="h-3.5 w-3.5" />
          {linkCopied ? 'Copied' : 'Copy join link'}
        </button>
      </div>
      {actionError && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      )}

      <details className="rounded-xl border border-gray-200 bg-white px-4 py-3">
        <summary className="cursor-pointer text-sm font-semibold text-gray-700">Settings</summary>
        <form onSubmit={handleSaveSettings} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm text-gray-600">
              {copy.waitSetting}
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
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
            </label>
            <label className="block text-sm text-gray-600">
              {copy.graceSetting}
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
                className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900"
              />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              disabled={savingSettings || !queue}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              {savingSettings ? 'Saving…' : 'Save'}
            </button>
            <button
              type="button"
              onClick={() => setShowCreateQueueModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Plus className="h-4 w-4" />
              {copy.addLine}
            </button>
          </div>
        </form>
      </details>

      <div className="rounded-2xl border border-gray-200 bg-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          {currentServingToken ? copy.nowLabel : nextInLineToken ? copy.readyLabel : 'Line'}
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentServingToken
                ? `#${currentServingToken.tokenNumber} ${currentServingToken.customerName}`
                : nextInLineToken
                ? `#${nextInLineToken.tokenNumber} ${nextInLineToken.customerName}`
                : copy.emptyNow}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {currentServingToken
                ? currentServingToken.customerPhone
                : nextInLineToken
                ? 'Next in line'
                : copy.readyDetail}
              {currentServingToken?.source === 'REMOTE' ? ` · ${copy.remote}` : ''}
              {currentServingToken?.arrivedAt ? ` · ${copy.arrived}` : ''}
              {foodBusiness && currentServingToken ? ` · ${currentServingToken.partySize} guests` : ''}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentServingToken ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    setPending({
                      title: `Call #${currentServingToken.tokenNumber} again?`,
                      description: `${currentServingToken.customerName} gets another alert that it is their turn.`,
                      confirmLabel: copy.recall,
                      variant: 'warning',
                      run: () => handleUpdateStatus(currentServingToken.id, 'call'),
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600"
                >
                  <Bell className="h-4 w-4" />
                  {copy.recall}
                </button>
                {currentServingToken.source === 'REMOTE' && !currentServingToken.arrivedAt && (
                  <button
                    type="button"
                    onClick={() =>
                      setPending({
                        title: `Mark #${currentServingToken.tokenNumber} as here?`,
                        description: `${currentServingToken.customerName} has reached the door.`,
                        confirmLabel: "They're here",
                        variant: 'primary',
                        run: () => handleArrive(currentServingToken.id),
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-cyan-200 bg-cyan-50 px-4 py-2.5 text-sm font-semibold text-cyan-800 hover:bg-cyan-100"
                  >
                    <MapPin className="h-4 w-4" />
                    They're here
                  </button>
                )}
                {foodBusiness ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (currentServingToken.table?.id) {
                        setPending({
                          title: `Seat #${currentServingToken.tokenNumber} at ${currentServingToken.table.name}?`,
                          description: `${currentServingToken.customerName} will see ${currentServingToken.table.name} on their phone and can add more items.`,
                          confirmLabel: `Seat at ${currentServingToken.table.name}`,
                          variant: 'primary',
                          run: () => handleUpdateStatus(currentServingToken.id, 'seat', currentServingToken.table.id),
                        });
                      } else {
                        setAssignMode('seat');
                        setTargetTableId('');
                        setSelectedTokenForSeat(currentServingToken);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <Armchair className="h-4 w-4" />
                    {currentServingToken.table?.name ? `Seat at ${currentServingToken.table.name}` : 'Seat them'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setPending({
                        title: `${copy.finish} for #${currentServingToken.tokenNumber}?`,
                        description: `${currentServingToken.customerName} will be marked done and leave the line.`,
                        confirmLabel: copy.finish,
                        variant: 'primary',
                        run: () => handleUpdateStatus(currentServingToken.id, 'complete'),
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                  >
                    <Check className="h-4 w-4" />
                    {copy.finish}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    setPending({
                      title: `Skip #${currentServingToken.tokenNumber}?`,
                      description: `${currentServingToken.customerName} leaves the active line. You can put them back from Skipped.`,
                      confirmLabel: 'Skip',
                      cancelLabel: 'Keep them',
                      variant: 'warning',
                      run: () => handleUpdateStatus(currentServingToken.id, 'skip'),
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  <SkipForward className="h-4 w-4" />
                  Skip
                </button>
              </>
            ) : nextInLineToken ? (
              <button
                type="button"
                onClick={() => {
                  if (!foodBusiness) {
                    setPending({
                      title: `${copy.callNext(nextInLineToken.tokenNumber)}?`,
                      description: `${nextInLineToken.customerName} will be told it is their turn.`,
                      confirmLabel: 'Call them',
                      variant: 'primary',
                      run: () => handleUpdateStatus(nextInLineToken.id, 'call'),
                    });
                    return;
                  }
                  setAssignMode('call');
                  setTargetTableId('');
                  setSelectedTokenForSeat(nextInLineToken);
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600"
              >
                <Bell className="h-4 w-4" />
                {copy.callNext(nextInLineToken.tokenNumber)}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {(lineTokens.length > 0 || activeFilter === 'SKIPPED' || searchQuery || skippedTokens.length > 0) && (
      <div className="rounded-2xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {activeFilter === 'SKIPPED' ? `Skipped (${skippedTokens.length})` : `Still waiting (${lineTokens.length})`}
          </h3>
          <button
            type="button"
            onClick={() => setActiveFilter(activeFilter === 'SKIPPED' ? 'ALL' : 'SKIPPED')}
            className="text-sm font-semibold text-orange-600 hover:underline"
          >
            {activeFilter === 'SKIPPED' ? 'Show the line' : `Skipped (${skippedTokens.length})`}
          </button>
        </div>

        {(waitingTokens.length > 4 || searchQuery) && (
          <div className="border-b border-gray-100 px-4 py-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search name, phone, or number"
                className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-8 text-sm focus:border-orange-500 focus:bg-white focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {lineTokens.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-700">
              {activeFilter === 'SKIPPED' ? copy.skippedEmpty : searchQuery ? 'Nothing matches that search' : featuredId ? 'No one else is waiting.' : copy.emptyTitle}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {activeFilter === 'SKIPPED' ? copy.skippedHint : searchQuery ? 'Try another name or number.' : featuredId ? 'They are shown above.' : copy.emptyBody}
            </p>
          </div>
        ) : (
          <ul>
            {lineTokens.map((token) => {
              const skipped = token.status === 'SKIPPED' || token.status === 'CANCELLED';
              const detail = [
                token.customerPhone,
                foodBusiness ? `${token.partySize} guests` : '',
                token.table?.name,
                token.source === 'REMOTE' ? copy.remote : '',
                token.onTheWayAt && !token.arrivedAt ? copy.onTheWay : '',
                token.arrivedAt ? copy.arrived : '',
                token.orders?.length ? `${copy.ordered}` : '',
                token.notes,
              ].filter(Boolean).join(' · ');
              return (
                <li key={token.id} className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-0">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-gray-900">
                      <span className="mr-2 text-orange-600">#{token.tokenNumber}</span>
                      {token.customerName}
                    </p>
                    <p className="truncate text-sm text-gray-500">{detail}</p>
                  </div>
                  {skipped ? (
                    <button
                      type="button"
                      onClick={() =>
                        setPending({
                          title: `Put #${token.tokenNumber} back in line?`,
                          description: `${token.customerName} returns to the waiting list.`,
                          confirmLabel: 'Put back',
                          variant: 'primary',
                          run: () => handleUpdateStatus(token.id, 'restore'),
                        })
                      }
                      className="shrink-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Put back
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        setPending({
                          title: `Remove #${token.tokenNumber}?`,
                          description: `${token.customerName} will be taken off the line.`,
                          confirmLabel: 'Remove',
                          cancelLabel: 'Keep them',
                          variant: 'danger',
                          run: () => handleUpdateStatus(token.id, 'cancel'),
                        })
                      }
                      className="shrink-0 text-sm font-medium text-gray-400 hover:text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      )}

      {foodBusiness && tokens.some((token) => token.status === 'SEATED') && (
        <div className="rounded-2xl border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">Seated</h3>
            <p className="text-sm text-gray-500">Close the bill only after the kitchen is finished and the bill is paid.</p>
          </div>
          <ul>
            {tokens.filter((token) => token.status === 'SEATED').map((token) => {
              const openOrders = (token.orders || []).filter((order: any) => !['CANCELLED', 'REJECTED'].includes(order.status));
              const cooking = openOrders.some((order: any) => ['PENDING', 'ACCEPTED', 'PREPARING'].includes(order.status));
              const unpaid = openOrders.some((order: any) => (order.payments || []).some((payment: any) => payment.status === 'PENDING') || (!(order.payments || []).length && openOrders.length));
              const note = cooking ? 'Kitchen is still cooking' : unpaid ? 'Bill is not paid yet' : token.table?.name || 'Ready to close';
              return (
              <li key={token.id} className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3 last:border-0">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">
                    <span className="mr-2 text-orange-600">#{token.tokenNumber}</span>
                    {token.customerName}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {token.table?.name || 'No table'} · {note}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {!cooking && unpaid && (
                    <button
                      type="button"
                      onClick={() => void handleMarkPaid(token.id)}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                    >
                      Mark paid
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={cooking || unpaid}
                    onClick={() =>
                      setPending({
                        title: `Close the bill for #${token.tokenNumber}?`,
                        description: `${token.customerName} leaves the table. The food is ready and the bill is paid.`,
                        confirmLabel: 'Close bill',
                        variant: 'primary',
                        run: () => handleUpdateStatus(token.id, 'complete'),
                      })
                    }
                    className="rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Close bill
                  </button>
                </div>
              </li>
              );
            })}
          </ul>
        </div>
      )}

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
                    {assignMode === 'call' ? 'Call' : 'Seat'} party #{selectedTokenForSeat.tokenNumber}
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
                The pre-order does not hold a table. It can be cooked after you call them.
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
                Tables for {selectedTokenForSeat.partySize || 1} guests
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                {tables.map((t) => {
                  const busy = (t.queueTokens || []).some((held: { id: string }) => held.id !== selectedTokenForSeat.id);
                  const tooSmall = Number(t.capacity) < Number(selectedTokenForSeat.partySize || 1);
                  const disabled = busy || tooSmall;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => setTargetTableId(t.id)}
                      className={`py-2.5 px-2 rounded-xl text-xs font-bold border transition-all text-center disabled:cursor-not-allowed disabled:opacity-50 ${
                        targetTableId === t.id
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 shadow-xs'
                          : 'border-gray-200 text-gray-700 bg-white hover:border-gray-300'
                      }`}
                    >
                      <span className="block truncate">{t.name}</span>
                      <span className="text-[10px] text-gray-400 font-normal">
                        {busy ? 'Taken' : tooSmall ? `Only ${t.capacity}` : `Seats ${t.capacity}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                disabled={!targetTableId}
                onClick={() =>
                  handleUpdateStatus(
                    selectedTokenForSeat.id,
                    assignMode === 'call' ? 'call' : 'seat',
                    targetTableId,
                  )
                }
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm flex items-center justify-center gap-2"
              >
                <Armchair className="w-4 h-4" />
                <span>
                  {targetTableId
                    ? `${assignMode === 'call' ? 'Call to' : 'Seat at'} ${tables.find((t) => t.id === targetTableId)?.name || 'this table'}`
                    : 'Choose a table'}
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  handleUpdateStatus(
                    selectedTokenForSeat.id,
                    assignMode === 'call' ? 'call' : 'seat',
                    undefined,
                    assignMode === 'call',
                  )
                }
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 font-medium py-2 rounded-xl text-xs transition-colors"
              >
                {assignMode === 'call' ? 'Call without a table' : 'Seat anyway, without a table'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Branded Confirm Modal for Token Cancellation */}
      <ConfirmModal
        isOpen={!!pending}
        onClose={() => setPending(null)}
        onConfirm={() => {
          const action = pending;
          setPending(null);
          void action?.run();
        }}
        title={pending?.title || ''}
        description={pending?.description || ''}
        confirmLabel={pending?.confirmLabel}
        cancelLabel={pending?.cancelLabel || 'Go back'}
        variant={pending?.variant || 'primary'}
      />
    </section>
  );
}

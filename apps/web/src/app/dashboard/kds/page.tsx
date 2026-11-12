'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  ChefHat,
  Clock,
  Bell,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play,
  Flame,
  AlertTriangle,
  RefreshCw,
  Maximize2,
  Minimize2,
  History,
  Undo2,
  CheckSquare,
  Square,
  Sparkles,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { lineName } from '@/lib/order-line';
import { BrandLockup } from '@/components/brand-mark';
import { BackLink } from '@/components/navigation-memory';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function KDSPage() {
  const [business, setBusiness] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'DINE_IN' | 'QUEUE_PREORDER' | 'TAKEAWAY'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [checkedItemIds, setCheckedItemIds] = useState<Set<string>>(new Set());
  const [recentlyClearedOrders, setRecentlyClearedOrders] = useState<any[]>([]);
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [ticketToClear, setTicketToClear] = useState<any>(null);
  const [kitchenError, setKitchenError] = useState('');
  const prevOrderCountRef = useRef(0);
  const router = useRouter();

  const apiUrl = getApiUrl();

  const toggleFullscreen = () => {
    if (typeof document === 'undefined') return;
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
        setIsFullscreen(false);
      }
    }
  };

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  const toggleItemCheck = (itemId: string) => {
    setCheckedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const playChime = () => {
    if (!soundEnabled || typeof window === 'undefined') return;
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.4);
    } catch {
      // Audio autoplay policy fallback
    }
  };

  const fetchOrders = async () => {
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

        const [orderRes, recentRes] = await Promise.all([
          fetch(`${apiUrl}/api/v1/orders/active/${curBiz.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${apiUrl}/api/v1/orders/recent-completed/${curBiz.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (orderRes.ok) {
          const activeOrders = await orderRes.json();
          // Detect new incoming order and sound chime
          if (activeOrders.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
            playChime();
          }
          prevOrderCountRef.current = activeOrders.length;
          setOrders(activeOrders);
        }

        if (recentRes.ok) {
          const recentData = await recentRes.json();
          setRecentlyClearedOrders(recentData || []);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 3000);
    return () => clearInterval(interval);
  }, []);

  const kitchenHeld = (order: any) =>
    Boolean(order.queueToken) && order.queueToken.status !== 'CALLED' && order.queueToken.status !== 'SEATED';

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      const response = await fetch(`${apiUrl}/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
        setKitchenError(message || 'The kitchen could not update that order.');
        return;
      }
      setKitchenError('');
      fetchOrders();
    } catch (err) {
      console.error(err);
      setKitchenError('The kitchen could not update that order.');
    }
  };

  const handleMarkServed = async (orderId: string) => {
    const token = localStorage.getItem('accessToken');
    const response = await fetch(`${apiUrl}/api/v1/orders/${orderId}/served`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message = Array.isArray(body.message) ? body.message.join(' ') : body.message;
      setKitchenError(message || 'Could not mark this order served.');
      return;
    }
    setKitchenError('');
    fetchOrders();
  };

  const handleRecallOrder = async (orderId: string, targetStatus: string = 'READY') => {
    await handleUpdateStatus(orderId, targetStatus);
    setRecentlyClearedOrders((prev) => prev.filter((o) => o.id !== orderId));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wide">Syncing kitchen station...</p>
        </div>
      </div>
    );
  }

  const getMinutesElapsed = (createdAt: string) => {
    const elapsedMs = Date.now() - new Date(createdAt).getTime();
    return Math.floor(elapsedMs / 60000);
  };

  const filteredOrders = orders.filter((o) => {
    if (filter === 'DINE_IN' && !o.table?.name && o.source !== 'TABLE_QR') return false;
    if (filter === 'QUEUE_PREORDER' && o.source !== 'QUEUE_PREORDER' && !o.queueTokenId && !o.queueToken) return false;
    if (filter === 'TAKEAWAY' && o.source !== 'TAKEAWAY') return false;
    return true;
  });

  const pendingOrders = filteredOrders.filter((o) => o.status === 'PENDING' || o.status === 'ACCEPTED');
  const preparingOrders = filteredOrders.filter((o) => o.status === 'PREPARING');
  const readyOrders = filteredOrders.filter((o) => o.status === 'READY');

  const renderOrderTitle = (order: any) => {
    if (order.table?.name) {
      return (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-base font-black text-white">
            🍽️ {order.table.name}
          </span>
          {order.source === 'QUEUE_PREORDER' && (
            <span className="text-[10px] bg-amber-500/20 text-amber-300 font-mono px-1.5 py-0.5 rounded border border-amber-500/40">
              Seated from Queue
            </span>
          )}
        </div>
      );
    }
    if (order.source === 'QUEUE_PREORDER' || order.queueTokenId || order.queueToken) {
      const tokenNum = order.queueToken?.tokenNumber ? `#${order.queueToken.tokenNumber}` : '';
      return (
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-base font-black text-amber-300">
              ⏳ Queue Pre-order {tokenNum}
            </span>
          </div>
          <span className="text-[10px] text-amber-400 font-semibold block">
            Dine-in (Seat Pending)
          </span>
        </div>
      );
    }
    return (
      <span className="text-base font-black text-purple-300">
        🛍️ Takeaway / Parcel
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* KDS Header Bar */}
      <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 bg-neutral-900 px-4 py-3 sm:px-6">
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          {business?.myRole !== 'KITCHEN_STAFF' && (
            <BackLink
              fallback="/dashboard"
              label="Back"
              className="inline-flex min-h-10 items-center gap-1.5 text-xs font-bold text-neutral-400 hover:text-white"
            />
          )}
          <div className="flex min-w-0 items-center gap-2">
            <BrandLockup tone="light" size="sm" venueName={business?.name} venueLogoUrl={business?.logoUrl} />
            <ChefHat className="h-5 w-5 shrink-0 text-orange-500" />
            <h1 className="text-sm font-black uppercase tracking-wider text-white">Kitchen</h1>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Recall Recently Cleared Tickets */}
          <button
            onClick={() => setShowRecallModal(true)}
            className={`p-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border ${
              recentlyClearedOrders.length > 0
                ? 'bg-neutral-800 hover:bg-neutral-700 text-amber-300 border-amber-600/40'
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-400 border-neutral-800'
            }`}
            title="Recall completed tickets"
          >
            <History className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] hidden md:inline">
              Recall {recentlyClearedOrders.length > 0 ? `(${recentlyClearedOrders.length})` : ''}
            </span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen Kitchen Mode'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            <span className="text-[11px] hidden lg:inline">{isFullscreen ? 'Exit Full' : 'Fullscreen'}</span>
          </button>

          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 border ${
              soundEnabled
                ? 'bg-neutral-800 text-emerald-400 border-emerald-900/50'
                : 'bg-neutral-800 text-neutral-400 border-neutral-700'
            }`}
            title={soundEnabled ? 'Mute new order chime' : 'Enable new order chime'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="text-[11px] hidden sm:inline">{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          {/* Mode Filter */}
          <div className="flex max-w-full items-center gap-1 overflow-x-auto rounded-xl border border-neutral-800 bg-neutral-900 p-1">
            {(['ALL', 'DINE_IN', 'QUEUE_PREORDER', 'TAKEAWAY'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`shrink-0 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-all ${
                  filter === mode
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {mode === 'ALL'
                  ? 'All'
                  : mode === 'DINE_IN'
                  ? 'Dine-in'
                  : mode === 'QUEUE_PREORDER'
                  ? 'Queue'
                  : 'Takeaway'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 3-Column Kitchen Operations Grid */}
      {kitchenError && (
        <p className="mx-6 mt-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100">
          {kitchenError}
        </p>
      )}
      <main className="flex-1 p-6 grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto">
        {/* Column 1: New / Pending Tickets */}
        <div className="flex flex-col bg-neutral-900/50 rounded-3xl border border-neutral-800/80 overflow-hidden">
          <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h2 className="font-black text-xs uppercase tracking-wider text-neutral-200">
                New Tickets ({pendingOrders.length})
              </h2>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">Awaiting prep</span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {pendingOrders.length === 0 ? (
              <div className="text-center py-16 text-neutral-600">
                <ChefHat className="w-10 h-10 mx-auto mb-2 text-neutral-700" />
                <p className="text-xs font-medium">No new orders waiting</p>
              </div>
            ) : (
              pendingOrders.map((order) => {
                const elapsed = getMinutesElapsed(order.createdAt);
                const isDelayed = elapsed > 10;
                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      isDelayed
                        ? 'bg-amber-950/40 border-amber-600/70 shadow-lg'
                        : 'bg-neutral-900 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        {renderOrderTitle(order)}
                        <span className="text-[10px] font-mono text-neutral-400">
                          #{order.id.slice(-4).toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isDelayed
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse'
                            : 'bg-neutral-800 text-neutral-300'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{elapsed}m ago</span>
                      </span>
                    </div>

                    {order.specialInstructions && (
                      <div className="bg-amber-900/40 border border-amber-700/50 text-amber-200 rounded-xl p-2.5 text-xs mb-3 flex items-start gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Chef Note:</span> {order.specialInstructions}
                        </div>
                      </div>
                    )}

                    {/* Order Items */}
                    <div className="space-y-1.5 py-2.5 border-t border-neutral-800 border-b mb-3">
                      {order.items?.map((item: any) => {
                        const isChecked = checkedItemIds.has(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleItemCheck(item.id)}
                            className="w-full flex justify-between items-start text-xs group text-left hover:bg-neutral-800/40 p-1 rounded-lg transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <Square className="w-4 h-4 text-neutral-500 group-hover:text-neutral-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className={`mr-2 text-lg font-black ${isChecked ? 'line-through text-neutral-500' : 'text-amber-400'}`}>
                                  {item.quantity}×
                                </span>
                                <span className={`text-base font-bold ${isChecked ? 'line-through text-neutral-500' : 'text-neutral-100'}`}>
                                  {lineName(item.menuItem?.name, item.addons)}
                                </span>
                                {item.specialNote && (
                                  <p className="text-[11px] text-neutral-400 italic mt-0.5">
                                    • {item.specialNote}
                                  </p>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {kitchenHeld(order) ? (
                      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-xs font-bold text-amber-200">
                        Held until party #{order.queueToken?.tokenNumber} is called
                      </p>
                    ) : (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md active:scale-98"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Start Cooking</span>
                    </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 2: In Preparation */}
        <div className="flex flex-col bg-neutral-900/50 rounded-3xl border border-neutral-800/80 overflow-hidden">
          <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-orange-500 animate-bounce" />
              <h2 className="font-black text-xs uppercase tracking-wider text-neutral-200">
                Cooking ({preparingOrders.length})
              </h2>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">On the stove</span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {preparingOrders.length === 0 ? (
              <div className="text-center py-16 text-neutral-600">
                <Flame className="w-10 h-10 mx-auto mb-2 text-neutral-700" />
                <p className="text-xs font-medium">Stove is clear</p>
              </div>
            ) : (
              preparingOrders.map((order) => {
                const elapsed = getMinutesElapsed(order.createdAt);
                const targetPrep = Math.max(15, ...(order.items?.map((i: any) => i.menuItem?.prepTimeMinutes || 15) || [15]));
                const isDelayed = elapsed > targetPrep;
                return (
                  <div
                    key={order.id}
                    className={`rounded-2xl p-4 border transition-all ${
                      isDelayed
                        ? 'bg-red-950/40 border-red-600/70 shadow-lg'
                        : 'bg-neutral-900 border-neutral-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2">
                        {renderOrderTitle(order)}
                        <span className="text-[10px] font-mono text-neutral-400">
                          #{order.id.slice(-4).toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isDelayed
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                            : elapsed > targetPrep * 0.7
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{elapsed}m / {targetPrep}m</span>
                      </span>
                    </div>

                    {order.specialInstructions && (
                      <div className="bg-amber-900/40 border border-amber-700/50 text-amber-200 rounded-xl p-2.5 text-xs mb-3">
                        ⚠️ {order.specialInstructions}
                      </div>
                    )}

                    <div className="space-y-1.5 py-2.5 border-t border-neutral-800 border-b mb-3">
                      {order.items?.map((item: any) => {
                        const isChecked = checkedItemIds.has(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => toggleItemCheck(item.id)}
                            className="w-full flex justify-between items-start text-xs group text-left hover:bg-neutral-800/40 p-1 rounded-lg transition-colors"
                          >
                            <div className="flex items-start gap-2">
                              {isChecked ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                              ) : (
                                <Square className="w-4 h-4 text-neutral-500 group-hover:text-neutral-400 shrink-0 mt-0.5" />
                              )}
                              <div>
                                <span className={`mr-2 text-lg font-black ${isChecked ? 'line-through text-neutral-500' : 'text-orange-400'}`}>
                                  {item.quantity}×
                                </span>
                                <span className={`text-base font-bold ${isChecked ? 'line-through text-neutral-500' : 'text-neutral-100'}`}>
                                  {lineName(item.menuItem?.name, item.addons)}
                                </span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {kitchenHeld(order) ? (
                      <p className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-xs font-bold text-amber-200">
                        Held until party #{order.queueToken?.tokenNumber} is called
                      </p>
                    ) : (
                    <button
                      onClick={() => handleUpdateStatus(order.id, 'READY')}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md active:scale-98"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>{order.source === 'TAKEAWAY' ? 'Ready to collect' : 'Mark Ready to Serve'}</span>
                    </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Column 3: Ready to Serve */}
        <div className="flex flex-col bg-neutral-900/50 rounded-3xl border border-neutral-800/80 overflow-hidden">
          <div className="p-4 bg-neutral-900 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <h2 className="font-black text-xs uppercase tracking-wider text-neutral-200">
                Ready to Serve ({readyOrders.length})
              </h2>
            </div>
            <span className="text-[11px] text-neutral-500 font-mono">Service pickup</span>
          </div>

          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            {readyOrders.length === 0 ? (
              <div className="text-center py-16 text-neutral-600">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-neutral-700" />
                <p className="text-xs font-medium">All dishes served</p>
              </div>
            ) : (
              readyOrders.map((order) => (
                <div
                  key={order.id}
                  className="bg-emerald-950/30 border border-emerald-700/60 rounded-2xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {renderOrderTitle(order)}
                      <p className="text-[11px] text-neutral-400 mt-0.5">
                        Guest: <span className="text-neutral-200 font-semibold">{order.customerName || 'Diner'}</span>
                      </p>
                    </div>
                    <span className="text-xs bg-emerald-500/20 text-emerald-300 font-bold px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                      Plated &amp; Ready
                    </span>
                  </div>

                  <div className="space-y-1.5 py-1 text-xs text-neutral-200">
                    {order.items?.map((item: any) => (
                      <div key={item.id} className="flex justify-between">
                        <span>{item.quantity}× {lineName(item.menuItem?.name, item.addons)}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => setTicketToClear(order)}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-2.5 rounded-xl text-xs transition-colors border border-neutral-700 flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{order.source === 'TAKEAWAY' ? 'Collected' : 'Served'}</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Ticket Recall Modal for Mistakenly Cleared Orders */}
      {showRecallModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
              <div className="flex items-center gap-2.5">
                <History className="w-5 h-5 text-amber-400" />
                <h3 className="font-black text-sm uppercase tracking-wider text-white">
                  Recently Cleared Tickets
                </h3>
              </div>
              <button
                onClick={() => setShowRecallModal(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-neutral-400">
              Put a served ticket back on the kitchen screen. Payment stays on Bills.
            </p>

            <div className="space-y-2.5 max-h-80 overflow-y-auto">
              {recentlyClearedOrders.length === 0 ? (
                <div className="text-center py-8 text-neutral-500 text-xs">
                  No served tickets to bring back.
                </div>
              ) : (
                recentlyClearedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-neutral-950 border border-neutral-800 rounded-xl p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-bold text-xs text-neutral-100">
                        {order.table?.name ? `Table ${order.table.name}` : `Order #${order.id.slice(-4).toUpperCase()}`}
                      </div>
                      <div className="text-[11px] text-neutral-400">
                        {order.items?.map((i: any) => `${i.quantity}× ${i.menuItem?.name}`).join(', ')}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handleRecallOrder(order.id, 'READY')}
                        className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                        title="Restore to Ready to Serve"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>To Ready</span>
                      </button>
                      <button
                        onClick={() => handleRecallOrder(order.id, 'PREPARING')}
                        className="bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 border border-orange-500/40 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all"
                        title="Restore to Cooking"
                      >
                        To Stove
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        isOpen={!!ticketToClear}
        onClose={() => setTicketToClear(null)}
        onConfirm={() => {
          const order = ticketToClear;
          setTicketToClear(null);
          if (order) void handleMarkServed(order.id);
        }}
        title={ticketToClear?.source === 'TAKEAWAY' ? 'Mark this takeaway collected?' : 'Mark this served?'}
        description={
          ticketToClear
            ? `${ticketToClear.table?.name ? `Table ${ticketToClear.table.name}` : ticketToClear.customerName || 'This order'} leaves the kitchen. The front desk takes payment on Bills.`
            : 'This order leaves the kitchen. The front desk takes payment on Bills.'
        }
        confirmLabel="Served"
        cancelLabel="Keep it"
        variant="warning"
      />
    </div>
  );
}

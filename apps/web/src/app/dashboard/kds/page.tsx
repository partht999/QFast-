'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChefHat,
  Clock,
  Bell,
  CheckCircle2,
  Volume2,
  VolumeX,
  Play,
  Flame,
  ArrowLeft,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

export default function KDSPage() {
  const [business, setBusiness] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'DINE_IN' | 'TAKEAWAY'>('ALL');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const prevOrderCountRef = useRef(0);
  const router = useRouter();

  const apiUrl = getApiUrl();

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

        const orderRes = await fetch(`${apiUrl}/api/v1/orders/active/${curBiz.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (orderRes.ok) {
          const activeOrders = await orderRes.json();
          // Detect new incoming order and sound chime
          if (activeOrders.length > prevOrderCountRef.current && prevOrderCountRef.current > 0) {
            playChime();
          }
          prevOrderCountRef.current = activeOrders.length;
          setOrders(activeOrders);
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

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`${apiUrl}/api/v1/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchOrders();
    } catch (err) {
      console.error(err);
    }
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
    if (filter === 'DINE_IN' && o.source !== 'TABLE_QR') return false;
    if (filter === 'TAKEAWAY' && o.source === 'TABLE_QR') return false;
    return true;
  });

  const pendingOrders = filteredOrders.filter((o) => o.status === 'PENDING' || o.status === 'ACCEPTED');
  const preparingOrders = filteredOrders.filter((o) => o.status === 'PREPARING');
  const readyOrders = filteredOrders.filter((o) => o.status === 'READY');

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* KDS Header Bar */}
      <header className="bg-neutral-900 border-b border-neutral-800 px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-neutral-400 hover:text-white text-xs font-bold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>
          <span className="text-neutral-700">|</span>
          <div className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-orange-500" />
            <h1 className="font-black text-sm uppercase tracking-wider text-white">
              Kitchen Display (KDS)
            </h1>
            <span className="text-xs bg-neutral-800 text-neutral-300 px-2.5 py-0.5 rounded-full font-mono border border-neutral-700">
              {business?.name}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
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
          <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-xl border border-neutral-800">
            {(['ALL', 'DINE_IN', 'TAKEAWAY'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setFilter(mode)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  filter === mode
                    ? 'bg-orange-500 text-white shadow-xs'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                {mode === 'ALL' ? 'All' : mode === 'DINE_IN' ? 'Dine-in' : 'Takeaway'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* 3-Column Kitchen Operations Grid */}
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
                        <span className="text-base font-black text-white">
                          {order.table?.name || 'Takeaway'}
                        </span>
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
                    <div className="space-y-2 py-2.5 border-t border-neutral-800 border-b mb-3">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-start text-xs">
                          <div>
                            <span className="font-black text-amber-400 text-sm mr-2.5">
                              {item.quantity}×
                            </span>
                            <span className="font-bold text-neutral-100">{item.menuItem?.name}</span>
                            {item.specialNote && (
                              <p className="text-[11px] text-neutral-400 italic ml-6 mt-0.5">
                                • {item.specialNote}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleUpdateStatus(order.id, 'PREPARING')}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-extrabold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md active:scale-98"
                    >
                      <Play className="w-3.5 h-3.5 fill-black" />
                      <span>Start Cooking</span>
                    </button>
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
                const isDelayed = elapsed > 20;
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
                        <span className="text-base font-black text-white">
                          {order.table?.name || 'Takeaway'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-400">
                          #{order.id.slice(-4).toUpperCase()}
                        </span>
                      </div>
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          isDelayed
                            ? 'bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse'
                            : 'bg-orange-500/20 text-orange-400'
                        }`}
                      >
                        <Clock className="w-3 h-3" />
                        <span>{elapsed}m elapsed</span>
                      </span>
                    </div>

                    {order.specialInstructions && (
                      <div className="bg-amber-900/40 border border-amber-700/50 text-amber-200 rounded-xl p-2.5 text-xs mb-3">
                        ⚠️ {order.specialInstructions}
                      </div>
                    )}

                    <div className="space-y-2 py-2.5 border-t border-neutral-800 border-b mb-3">
                      {order.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between items-start text-xs">
                          <div>
                            <span className="font-black text-orange-400 text-sm mr-2.5">
                              {item.quantity}×
                            </span>
                            <span className="font-bold text-neutral-100">{item.menuItem?.name}</span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => handleUpdateStatus(order.id, 'READY')}
                      className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-2.5 rounded-xl text-xs transition-colors flex items-center justify-center gap-2 shadow-md active:scale-98"
                    >
                      <Bell className="w-3.5 h-3.5" />
                      <span>Mark Ready to Serve</span>
                    </button>
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
                      <span className="text-base font-black text-white">
                        {order.table?.name || 'Takeaway'}
                      </span>
                      <p className="text-[11px] text-neutral-400">
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
                        <span>{item.quantity}× {item.menuItem?.name}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => handleUpdateStatus(order.id, 'COMPLETED')}
                    className="w-full bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-bold py-2.5 rounded-xl text-xs transition-colors border border-neutral-700 flex items-center justify-center gap-1.5 active:scale-98"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Clear Ticket (Order Served)</span>
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

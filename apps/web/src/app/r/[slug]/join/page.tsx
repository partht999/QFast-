'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Users,
  Clock,
  Ticket,
  Bell,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  Sparkles,
  Phone,
  QrCode,
  UtensilsCrossed,
  UserRound,
  Gift,
  ArrowRight,
  Stethoscope,
  Scissors,
} from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { getApiUrl } from '@/lib/api';
import { getBusinessPublicPath, isClinicalBusiness, isFoodBusiness } from '@/lib/business-links';
import { isIndianMobile, localMobile } from '@/lib/phone';
import { ReviewPrompt } from '@/components/review-prompt';
import { reviewHref } from '@/lib/google-place';
import { VisitBill } from '@/components/visit-bill';
import { ConfirmModal } from '@/components/ui/confirm-modal';

export default function JoinQueuePage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [queues, setQueues] = useState<any[]>([]);
  const [selectedQueueId, setSelectedQueueId] = useState<string>('');
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    partySize: 2,
    notes: '',
  });
  const [activeToken, setActiveToken] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [takeawayId, setTakeawayId] = useState('');
  const [visitChoice, setVisitChoice] = useState<'dine-in' | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [stampBurst, setStampBurst] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [joinSource, setJoinSource] = useState<'REMOTE' | 'WALK_IN'>('REMOTE');
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>('default');
  const lastNotifiedToken = useRef<string | null>(null);
  const lastBrowserAlertToken = useRef<string | null>(null);

  const apiUrl = getApiUrl();
  const publicPath = getBusinessPublicPath(slug, queueStatus?.businessType);
  const foodBusiness = isFoodBusiness(queueStatus?.businessType);
  const clinicalBusiness = isClinicalBusiness(queueStatus?.businessType);

  const fetchStatus = async () => {
    try {
      const [res, qRes] = await Promise.all([
        fetch(`${apiUrl}/api/v1/queue/public/${slug}/status`),
        fetch(`${apiUrl}/api/v1/queue/public/${slug}/queues`),
      ]);
      if (res.ok) {
        const data = await res.json();
        setQueueStatus(data);
      }
      if (qRes.ok) {
        const qData = await qRes.json();
        setQueues(qData || []);
        if (qData.length > 0 && !selectedQueueId) {
          const firstOpen = qData.find((q: any) => q.isOpen && !q.isPaused) || qData[0];
          setSelectedQueueId(firstOpen?.id || '');
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestConfirmation = async () => {
    if (!activeToken) return;
    setError('');
    try {
      const response = await fetch(
        `${apiUrl}/api/v1/queue/public/token/${activeToken.id}/on-the-way`,
        { method: 'POST' },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Could not update your arrival status');
      setActiveToken((current: any) => ({ ...current, ...data }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update your arrival status');
    }
  };

  const enableBrowserAlerts = async () => {
    if (!('Notification' in window)) {
      setNotificationPermission('unsupported');
      return;
    }
    const permission = await Notification.requestPermission();
    setNotificationPermission(permission);
  };

  const checkExistingToken = async () => {
    if (new URLSearchParams(window.location.search).get('fresh')) {
      localStorage.removeItem(`qfast_token_${slug}`);
      setActiveToken(null);
      return;
    }
    const savedTokenId = localStorage.getItem(`qfast_token_${slug}`);
    if (savedTokenId) {
      try {
        const res = await fetch(`${apiUrl}/api/v1/queue/public/token/${savedTokenId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'WAITING' || data.status === 'CALLED' || data.status === 'SEATED' || data.status === 'COMPLETED') {
            noteVisit(data);
            setActiveToken(data);
            if (data.status === 'CALLED' && typeof window !== 'undefined' && 'vibrate' in navigator) {
              navigator.vibrate([300, 100, 300]);
            }
          } else {
            localStorage.removeItem(`qfast_token_${slug}`);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }
  };

  const noteVisit = (data: any) => {
    if (data?.status === 'COMPLETED' && data?.loyalty?.hasProgram && !sessionStorage.getItem(`qfast_stamp_${data.id}`)) {
      setStampBurst(true);
      sessionStorage.setItem(`qfast_stamp_${data.id}`, '1');
    }
  };

  useEffect(() => {
    const saved = localStorage.getItem(`qfast_takeaway_${slug}`);
    if (saved) setTakeawayId(saved);
  }, [slug]);

  useEffect(() => {
    const source = new URLSearchParams(window.location.search).get('source');
    setJoinSource(source === 'walkin' ? 'WALK_IN' : 'REMOTE');
    setNotificationPermission(
      'Notification' in window ? Notification.permission : 'unsupported',
    );
  }, []);

  useEffect(() => {
    fetchStatus();
    checkExistingToken();
    const interval = setInterval(() => {
      fetchStatus();
      if (activeToken?.id) {
        fetch(`${apiUrl}/api/v1/queue/public/token/${activeToken.id}`)
          .then((r) => r.json())
          .then((data) => {
            if (data.id) {
              if (data.status === 'CALLED' && lastNotifiedToken.current !== data.id) {
                if (typeof window !== 'undefined' && 'vibrate' in navigator) {
                  navigator.vibrate([400, 200, 400]);
                }
                setShowConfetti(true);
                setTimeout(() => setShowConfetti(false), 3000);
                lastNotifiedToken.current = data.id;
              }
              if (
                data.status === 'CALLED' &&
                'Notification' in window &&
                Notification.permission === 'granted' &&
                lastBrowserAlertToken.current !== data.id
              ) {
                new Notification(`${data.business?.name || 'Business'}: your turn is ready`, {
                  body: `Please arrive by ${
                    data.arrivalDeadlineAt
                      ? new Date(data.arrivalDeadlineAt).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                      : 'now'
                  }.`,
                });
                lastBrowserAlertToken.current = data.id;
              }
              noteVisit(data);
              if (data.status === 'COMPLETED' && !sessionStorage.getItem(`qfast_review_${data.id}`)) {
                sessionStorage.setItem(`qfast_review_${data.id}`, '1');
                setReviewOpen(true);
              }
              if (data.status === 'NO_SHOW') {
                localStorage.removeItem(`qfast_token_${slug}`);
                setActiveToken(null);
                setError('Your arrival window expired and your place in the queue was released.');
              } else {
                setActiveToken(data);
              }
            }
          })
          .catch(console.error);
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [slug, activeToken?.id]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    if (!isIndianMobile(form.customerPhone)) {
      setError('Enter a 10-digit mobile number starting with 6, 7, 8, or 9.');
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`${apiUrl}/api/v1/queue/public/${slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          customerPhone: localMobile(form.customerPhone),
          queueId: selectedQueueId || undefined,
          source: joinSource,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to join queue');

      setActiveToken(data);
      localStorage.setItem(`qfast_token_${slug}`, data.id);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelToken = async () => {
    if (!activeToken) return;
    try {
      await fetch(`${apiUrl}/api/v1/queue/public/token/${activeToken.id}/cancel`, {
        method: 'POST',
      });
      localStorage.removeItem(`qfast_token_${slug}`);
      setActiveToken(null);
      setShowCancelModal(false);
      fetchStatus();
    } catch (err) {
      console.error(err);
    }
  };

  // Estimated wait progress (0–100)
  const waitProgress = activeToken
    ? Math.max(
        5,
        Math.min(
          95,
          activeToken.position <= 0
            ? 95
            : 100 - (activeToken.position / Math.max(queueStatus?.waitingCount || 1, 1)) * 100
        )
      )
    : 0;

  if (!loading && queueStatus && queueStatus.visitsOpen === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6">
        <div className="max-w-sm rounded-3xl bg-white p-6 text-center shadow-sm">
          <h1 className="text-xl font-black text-neutral-950">{queueStatus.businessName || 'This queue'}</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">This queue is paused because the business plan has expired. Please speak to the counter.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-orange-50/60 via-white to-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-14 h-14 border-[3px] border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-xs font-semibold text-neutral-500 uppercase tracking-wider">Loading queue status...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50/60 via-white to-neutral-50 text-neutral-900 flex flex-col justify-between">
      {/* Confetti overlay */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full"
              style={{
                width: `${6 + Math.random() * 8}px`,
                height: `${6 + Math.random() * 8}px`,
                background: ['#f97316', '#fbbf24', '#ef4444', '#22c55e', '#3b82f6', '#a855f7'][i % 6],
                left: `${10 + Math.random() * 80}%`,
                top: `${5 + Math.random() * 30}%`,
                animation: `confetti-pop ${0.8 + Math.random() * 0.8}s ease-out ${Math.random() * 0.4}s forwards`,
                opacity: 0,
              }}
            />
          ))}
        </div>
      )}

      {/* Top Header */}
      <header className="px-6 py-4 bg-white/90 backdrop-blur-md border-b border-orange-100/80 flex items-center justify-between sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-2">
          <BrandMark href="/" size="sm" label="Qfast home" />
          <span className="rounded-md bg-neutral-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500">
            Live queue
          </span>
        </div>
        <nav className="flex items-center gap-2">
          {foodBusiness && (
            <Link
              href={`${publicPath}/loyalty`}
              className="text-xs font-bold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200/60 px-3 py-2 rounded-full transition-all flex items-center gap-1.5"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>Stamps</span>
            </Link>
          )}
          {foodBusiness && activeToken && (
            <Link
              href={`/r/${slug}/table/queue?token=${activeToken.id}`}
              className="text-xs font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200/60 px-3 py-2 rounded-full transition-all flex items-center gap-1.5"
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              <span>Menu</span>
            </Link>
          )}
        </nav>
      </header>

      {/* Main Container */}
      <main className="max-w-md w-full mx-auto p-5 my-auto">
        <div className="text-center mb-7">
          <div className="inline-flex items-center gap-1.5 bg-orange-100/80 text-orange-800 text-xs font-bold px-3.5 py-1.5 rounded-full mb-3 border border-orange-200/60">
            <QrCode className="w-3.5 h-3.5 text-orange-600" />
            <span>{foodBusiness && !activeToken && !visitChoice ? 'Choose your visit' : 'Join the queue'}</span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">
            {queueStatus?.businessName || 'Customer Queue'}
          </h1>
          {queueStatus?.address && <p className="mt-1 text-xs text-neutral-500">{queueStatus.address}</p>}
          {queueStatus?.instagramHandle && (
            <a
              href={`https://instagram.com/${queueStatus.instagramHandle}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex text-xs font-bold text-orange-700"
            >
              Follow @{queueStatus.instagramHandle}
            </a>
          )}
          <p className="text-xs text-neutral-400 mt-1.5">
            {foodBusiness && !activeToken && !visitChoice
              ? 'Eat here and wait for a table, or take it away.'
              : 'Live queue updates • Optional browser alerts while this page is open'}
          </p>
        </div>

        {activeToken ? (
          /* Active Token Card */
          <div className="animate-bounce-in">
            <div className="bg-white rounded-3xl p-6 border-2 border-orange-400/80 shadow-xl text-center space-y-5 relative overflow-hidden">
              {/* Background pattern */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(251,146,60,0.06),transparent_50%)] pointer-events-none" />

              {activeToken.status === 'CALLED' ? (
                <div className="relative bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-400 text-amber-950 rounded-2xl p-5 animate-pulse-glow">
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping" />
                  <Bell className="w-10 h-10 text-amber-600 mx-auto mb-2" />
                  <p className="font-black text-base uppercase tracking-wide">
                    {foodBusiness
                      ? activeToken.table?.name
                        ? `Table ${activeToken.table.name}`
                        : 'Your turn is here'
                      : clinicalBusiness
                        ? 'The doctor is ready'
                        : 'It’s your turn'}
                  </p>
                  <p className="text-xs mt-1 font-medium text-amber-800">
                    {foodBusiness
                      ? activeToken.table?.name
                        ? 'Come to the host. This table is yours.'
                        : 'Come to the host. They will seat you as soon as a table is free.'
                      : clinicalBusiness
                        ? 'Please go in for your visit.'
                        : 'Please come to the counter.'}
                  </p>
                </div>
              ) : activeToken.status !== 'COMPLETED' && activeToken.status !== 'SEATED' ? (
                <div className="bg-orange-50 border border-orange-200 text-orange-800 rounded-full py-2 px-4 inline-flex items-center gap-2 text-xs font-extrabold">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
                  </span>
                  <span>Live in Waitlist</span>
                </div>
              ) : null}

              {activeToken.status === 'CALLED' && activeToken.source === 'REMOTE' && !activeToken.arrivedAt && (
                <div className="relative z-10 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left">
                  <p className="text-sm font-bold text-amber-900">
                    Please arrive by {activeToken.arrivalDeadlineAt
                      ? new Date(activeToken.arrivalDeadlineAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'now'}.
                  </p>
                  <p className="mt-1 text-xs text-amber-800">
                    Confirm you’re on the way. When you arrive, ask staff to check you in. Your place may be released if the arrival window passes.
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                    {!activeToken.onTheWayAt && (
                      <button
                        type="button"
                        onClick={() => void handleGuestConfirmation()}
                        className="flex-1 rounded-xl bg-amber-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-amber-700"
                      >
                        I’m on my way
                      </button>
                    )}
                  </div>
                </div>
              )}
              {notificationPermission === 'default' && (
                <button
                  type="button"
                  onClick={() => void enableBrowserAlerts()}
                  className="relative z-10 w-full rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100"
                >
                  Enable browser alerts on this device
                </button>
              )}
              {error && (
                <div role="alert" className="relative z-10 rounded-xl border border-red-200 bg-red-50 p-3 text-left text-xs text-red-700">
                  {error}
                </div>
              )}

              {/* 4-Step Progress Stepper */}
              <div className="relative z-10 pt-1 pb-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  {[
                    { step: 1, label: 'Waiting', active: true, done: activeToken.position <= 2 || activeToken.status === 'CALLED' || activeToken.status === 'SEATED' || activeToken.status === 'COMPLETED' },
                    { step: 2, label: 'Almost Ready', active: activeToken.position <= 2 || activeToken.status === 'CALLED' || activeToken.status === 'SEATED' || activeToken.status === 'COMPLETED', done: activeToken.status === 'CALLED' || activeToken.status === 'SEATED' || activeToken.status === 'COMPLETED' },
                    { step: 3, label: foodBusiness ? 'Seated' : 'Serving', active: activeToken.status === 'CALLED' || activeToken.status === 'SEATED' || activeToken.status === 'COMPLETED', done: activeToken.status === 'COMPLETED' },
                    { step: 4, label: 'Done', active: activeToken.status === 'COMPLETED', done: activeToken.status === 'COMPLETED' },
                  ].map((s, idx) => (
                    <div key={s.step} className="flex-1 flex flex-col items-center relative">
                      {idx > 0 && (
                        <div className={`absolute top-3 right-1/2 w-full h-1 -z-0 ${
                          s.active ? 'bg-orange-500' : 'bg-neutral-200'
                        }`} />
                      )}
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black z-10 ${
                        s.done
                          ? 'bg-emerald-600 text-white'
                          : s.active
                          ? 'bg-orange-500 text-white ring-4 ring-orange-100'
                          : 'bg-neutral-200 text-neutral-500'
                      }`}>
                        {s.done ? '✓' : s.step}
                      </div>
                      <span className={`text-[10px] mt-1.5 font-bold ${
                        s.active ? 'text-neutral-900' : 'text-neutral-400'
                      }`}>
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="relative z-10">
                <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 block mb-1.5">
                  Your Token Number
                </span>
                <div className="text-7xl font-black text-orange-600 tracking-tighter animate-number-pop leading-none">
                  #{activeToken.tokenNumber}
                </div>
                {clinicalBusiness && activeToken.doctorName && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/70 text-orange-900 text-xs font-bold mt-2">
                    <Stethoscope className="w-3.5 h-3.5 text-orange-600" />
                    <span>{activeToken.doctorName}</span>
                  </div>
                )}
                {!foodBusiness && !clinicalBusiness && activeToken.serviceName && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-100/70 text-orange-900 text-xs font-bold mt-2">
                    <Scissors className="w-3.5 h-3.5 text-orange-600" />
                    <span>{activeToken.serviceName}</span>
                  </div>
                )}
                <p className="text-sm font-bold text-neutral-800 mt-2">{activeToken.customerName}</p>
                {foodBusiness && activeToken.status === 'SEATED' && (
                  <p className="mt-3 rounded-2xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
                    {activeToken.table?.name
                      ? `You are at ${activeToken.table.name}. Add anything else, then the bill is closed at the table.`
                      : 'You are seated. Add anything else before the bill is closed.'}
                  </p>
                )}
                {foodBusiness && Array.isArray(activeToken.orders) && activeToken.orders.length > 0 && activeToken.status !== 'SEATED' && activeToken.status !== 'COMPLETED' && (
                  <div className="mt-4 rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-left">
                    <p className="text-xs font-black uppercase tracking-wider text-neutral-500">
                      {activeToken.status === 'COMPLETED' ? 'Your bill' : 'Items on your visit'}
                    </p>
                    <div className="mt-2 space-y-1.5">
                      {activeToken.orders.flatMap((order: any) =>
                        (order.items || []).map((item: any) => (
                          <div key={item.id} className="flex justify-between text-sm text-neutral-800">
                            <span>{item.quantity} × {item.menuItem?.name || 'Item'}</span>
                            <span>₹{Number(item.totalPrice || 0).toFixed(0)}</span>
                          </div>
                        )),
                      )}
                    </div>
                    <div className="mt-2 flex justify-between border-t border-neutral-200 pt-2 text-sm font-black text-neutral-950">
                      <span>Total</span>
                      <span>
                        ₹{activeToken.orders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0).toFixed(0)}
                      </span>
                    </div>
                  </div>
                )}
                {foodBusiness && (
                  <div className="flex items-center justify-center gap-1 mt-1 text-neutral-400">
                    {Array.from({ length: activeToken.partySize }).map((_, i) => (
                      <UserRound key={i} className="w-3.5 h-3.5" />
                    ))}
                    <span className="text-xs ml-1">Party of {activeToken.partySize}</span>
                  </div>
                )}
              </div>

              {(activeToken.status === 'COMPLETED' || (!foodBusiness && activeToken.status === 'SEATED')) && (
                <VisitFinished
                  foodBusiness={foodBusiness}
                  clinicalBusiness={clinicalBusiness}
                  loyalty={activeToken.loyalty}
                  reviewUrl={reviewHref(activeToken.business?.googleReviewUrl, activeToken.business?.googlePlaceId)}
                  stampsHref={`${publicPath}/loyalty?phone=${encodeURIComponent(activeToken.customerPhone || '')}`}
                  onStartAgain={() => {
                    localStorage.removeItem(`qfast_token_${slug}`);
                    setActiveToken(null);
                    setReviewOpen(false);
                  }}
                />
              )}

                {foodBusiness && activeToken.status === 'SEATED' && (
                <VisitBill
                  title="Running bill"
                  businessName={queueStatus?.businessName || activeToken.business?.name}
                  address={queueStatus?.address || activeToken.business?.address}
                  phone={queueStatus?.phone || activeToken.business?.phone}
                  gstin={queueStatus?.gstin || activeToken.business?.gstin}
                  logoUrl={queueStatus?.logoUrl || activeToken.business?.logoUrl}
                  detail={activeToken.table?.name ? `Table ${activeToken.table.name}` : `Token #${activeToken.tokenNumber}`}
                  billNo={String(activeToken.tokenNumber)}
                  downloadName={`bill-${activeToken.tokenNumber}`}
                  payments={(activeToken.orders || []).flatMap((order: any) => order.payments || [])}
                  lines={(activeToken.orders || []).flatMap((order: any) =>
                    (order.items || []).map((item: any) => ({
                      id: item.id,
                      name: item.menuItem?.name || 'Item',
                      quantity: item.quantity,
                      amount: Number(item.totalPrice || 0),
                      note: item.specialNote,
                    })),
                  )}
                  subtotal={(activeToken.orders || []).reduce((sum: number, order: any) => sum + Number(order.subtotal || 0), 0)}
                  tax={(activeToken.orders || []).reduce((sum: number, order: any) => sum + Number(order.taxAmount || 0), 0)}
                  total={(activeToken.orders || []).reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0)}
                />
              )}

              {activeToken.status !== 'COMPLETED' && activeToken.status !== 'SEATED' && (
              <>
              {/* Wait Progress Bar */}
              <div className="relative z-10 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Estimated Progress</span>
                  <span className="text-orange-600">{Math.round(waitProgress)}%</span>
                </div>
                <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-orange-400 to-amber-400 rounded-full transition-all duration-1000 ease-out animate-progress-fill"
                    style={{ width: `${waitProgress}%` }}
                  />
                </div>
              </div>

              {/* Wait Status Grid */}
              <div className="relative z-10 grid grid-cols-2 gap-3 bg-neutral-50/80 rounded-2xl p-4 border border-neutral-100">
                <div className="text-center">
                  <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider">
                    Queue Position
                  </span>
                  <span className="text-2xl font-black text-neutral-900 block mt-0.5">
                    {activeToken.position > 0 ? `#${activeToken.position}` : 'Next up!'}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-[10px] font-bold text-neutral-400 block uppercase tracking-wider">
                    Est. Wait
                  </span>
                  <div className="flex items-center justify-center gap-1 mt-0.5">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-2xl font-black text-orange-600">
                      ~{activeToken.estimatedWaitMin || 5}
                    </span>
                    <span className="text-xs font-bold text-orange-600">min</span>
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-2 flex flex-col gap-2.5">
                {foodBusiness && (
                  <div className="space-y-1">
                    <Link
                      href={`/r/${slug}/table/queue?token=${activeToken.id}`}
                      className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold py-3.5 rounded-2xl transition-all duration-200 shadow-md text-sm flex items-center justify-center gap-2 hover:shadow-lg hover:scale-[1.01] active:scale-[0.98]"
                    >
                      <UtensilsCrossed className="w-4 h-4" />
                      <span>{activeToken.orders?.length ? 'Add more items' : 'Order while you wait'}</span>
                      <ChevronRight className="w-4 h-4 -ml-0.5" />
                    </Link>
                    <p className="text-[11px] text-center text-neutral-500 font-medium">
                      The kitchen starts now. You come back to this queue after ordering.
                    </p>
                  </div>
                )}
                <button
                  onClick={() => setShowCancelModal(true)}
                  className="text-xs text-neutral-400 hover:text-red-500 py-2 transition-all duration-200 font-medium hover:bg-red-50 rounded-xl"
                >
                  Leave queue / Cancel token
                </button>
              </div>
              </>
              )}
              {foodBusiness && activeToken.status === 'SEATED' && (
                <Link
                  href={`/r/${slug}/table/queue?token=${activeToken.id}`}
                  className="relative z-10 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 text-sm font-extrabold text-white"
                >
                  <UtensilsCrossed className="h-4 w-4" />
                  Add more items
                </Link>
              )}
            </div>
          </div>
        ) : foodBusiness && !visitChoice ? (
          <div className="animate-fade-in-scale space-y-3">
            <button
              type="button"
              onClick={() => setVisitChoice('dine-in')}
              className="w-full rounded-3xl border-2 border-orange-300 bg-white p-5 text-left shadow-sm"
            >
              <p className="text-lg font-black text-neutral-950">Dine in</p>
              <p className="mt-1 text-sm text-neutral-600">Join the queue. You can order while you wait, then we seat you at a free table.</p>
            </button>
            <Link
              href={`/r/${slug}/table/takeaway`}
              className="block w-full rounded-3xl border border-neutral-200 bg-white p-5 text-left shadow-sm"
            >
              <p className="text-lg font-black text-neutral-950">Takeaway</p>
              <p className="mt-1 text-sm text-neutral-600">No table. Order now, and we will show you when it is ready to collect.</p>
            </Link>
            {takeawayId && (
              <Link href={`/r/${slug}/order/${takeawayId}`} className="block rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-900">
                You already have a takeaway order. Check if it is ready.
              </Link>
            )}
          </div>
        ) : (
          /* Join Queue Form */
          <div className="animate-fade-in-scale">
            <div className="bg-white rounded-3xl p-6 border border-orange-100 shadow-xl space-y-5">
                {notificationPermission === 'default' && (
                  <button
                    type="button"
                    onClick={() => void enableBrowserAlerts()}
                    className="w-full rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-semibold text-orange-800 hover:bg-orange-100"
                  >
                    Enable alerts on this device (keep this page open)
                  </button>
                )}
              {/* Live Queue Overview */}
              <div className="grid grid-cols-2 gap-3 bg-gradient-to-br from-orange-50/80 to-amber-50/50 border border-orange-100 rounded-2xl p-4 text-center">
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-700 block">
                    {foodBusiness ? 'Waiting Parties' : 'People Waiting'}
                  </span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <Users className="w-4 h-4 text-orange-500" />
                    <span className="text-2xl font-black text-neutral-900">
                      {queueStatus?.waitingCount ?? 0}
                    </span>
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-700 block">
                    Current Wait
                  </span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span className="text-2xl font-black text-orange-600">
                      ~{queueStatus?.estimatedWaitMin ?? 0}
                    </span>
                    <span className="text-xs font-bold text-orange-600">min</span>
                  </div>
                </div>
              </div>

              {queueStatus?.isOpen === false ||
              (joinSource === 'REMOTE' && queueStatus?.remoteJoinEnabled === false) ? (
                <div className="text-center py-8 text-neutral-500 space-y-3">
                  <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-7 h-7 text-red-500" />
                  </div>
                  <p className="font-bold text-neutral-800 text-sm">
                    {queueStatus?.isOpen === false ? 'Queue is currently closed' : 'Remote joining is paused'}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {joinSource === 'WALK_IN'
                      ? 'Please speak with a staff member at the entrance.'
                      : 'Please contact the business or try again later.'}
                  </p>
                </div>
              ) : (
                <form onSubmit={handleJoin} className="space-y-4">
                  {foodBusiness && (
                    <button type="button" onClick={() => setVisitChoice(null)} className="text-xs font-bold text-neutral-500">
                      Back to dine in or takeaway
                    </button>
                  )}
                  {!foodBusiness && queues.length > 1 && (
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                        {clinicalBusiness ? 'Choose a consultation' : 'Choose a queue'}
                      </label>
                      <div className="space-y-2">
                        {queues.map((q) => (
                          <label
                            key={q.id}
                            className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition ${
                              selectedQueueId === q.id
                                ? 'border-orange-500 bg-orange-50/60 shadow-xs'
                                : 'border-neutral-200 bg-white hover:bg-neutral-50'
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <input
                                type="radio"
                                name="queueSelection"
                                checked={selectedQueueId === q.id}
                                onChange={() => setSelectedQueueId(q.id)}
                                className="text-orange-500 focus:ring-orange-500"
                              />
                              <div>
                                <p className="text-xs font-bold text-neutral-900">
                                  {clinicalBusiness && q.doctorName ? q.doctorName : q.name}
                                </p>
                                {q.department && (
                                  <p className="text-[10px] text-neutral-500">{q.department}</p>
                                )}
                              </div>
                            </div>
                            <span className="text-[11px] font-bold text-neutral-600">
                              ~{q.estimatedWaitMin || 5}m wait
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                      Your Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                      className="w-full border border-neutral-200 rounded-xl px-3.5 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden transition-all duration-200 bg-neutral-50/50 focus:bg-white"
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3 h-3" />
                        Mobile Number (for queue updates) *
                      </span>
                    </label>
                    <input
                      type="tel"
                      required
                      inputMode="numeric"
                      autoComplete="tel"
                      value={form.customerPhone}
                      onChange={(e) => setForm({ ...form, customerPhone: e.target.value })}
                      className="w-full border border-neutral-200 rounded-xl px-3.5 py-3 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden transition-all duration-200 bg-neutral-50/50 focus:bg-white"
                      placeholder="10-digit mobile number"
                    />
                  </div>

                  {foodBusiness && <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-2">
                      Party Size (Guests) *
                    </label>
                    <div className="flex items-center gap-2">
                      {[1, 2, 4, 6, 8].map((size) => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setForm({ ...form, partySize: size })}
                          className={`flex-1 py-2.5 rounded-xl font-bold text-sm border transition-all duration-200 flex flex-col items-center gap-0.5 ${
                            form.partySize === size
                              ? 'bg-orange-500 border-orange-500 text-white shadow-md scale-[1.03]'
                              : 'bg-white border-neutral-200 text-neutral-700 hover:border-orange-300 hover:bg-orange-50/50 active:scale-[0.97]'
                          }`}
                        >
                          <div className="flex items-center gap-px">
                            {Array.from({ length: Math.min(size, 4) }).map((_, i) => (
                              <UserRound key={i} className={`w-3 h-3 ${form.partySize === size ? 'text-white/80' : 'text-neutral-400'}`} />
                            ))}
                            {size > 4 && <span className={`text-[9px] font-bold ${form.partySize === size ? 'text-white/80' : 'text-neutral-400'}`}>+</span>}
                          </div>
                          <span>{size}</span>
                        </button>
                      ))}
                    </div>
                  </div>}

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                      {foodBusiness ? 'Seating Preference / Special Notes (Optional)' : 'Notes or Access Needs (Optional)'}
                    </label>
                    <input
                      type="text"
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      className="w-full border border-neutral-200 rounded-xl px-3.5 py-2.5 text-sm focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden transition-all duration-200 bg-neutral-50/50 focus:bg-white"
                      placeholder={foodBusiness ? 'e.g. High chair needed, booth preferred' : 'Add a note for the team'}
                    />
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 text-xs rounded-xl p-3 font-semibold flex items-center gap-2 animate-slide-in-down">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 disabled:hover:from-orange-500 disabled:hover:to-amber-500 text-white font-black py-4 rounded-2xl transition-all duration-200 shadow-md hover:shadow-lg text-sm mt-2 flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.98]"
                  >
                    {submitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Generating Token…</span>
                      </>
                    ) : (
                      <>
                        <Ticket className="w-4 h-4" />
                        <span>Join Live Queue</span>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-5 text-center text-[11px] text-neutral-400 font-medium">
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 text-orange-400" />
          Powered by Qfast · No app install required
        </span>
      </footer>

      {/* Cancel Queue Confirmation Modal */}
      {stampBurst && foodBusiness && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-6">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-orange-500 text-5xl text-white shadow-lg shadow-orange-300 animate-bounce">
              ★
            </div>
            <h2 className="mt-4 text-2xl font-black text-neutral-950">A stamp was added</h2>
            <p className="mt-2 text-sm text-neutral-600">
              Collect stamps each time you are served. {activeToken?.loyalty?.stamps || 1} of {activeToken?.loyalty?.stampsForReward || 8} toward {activeToken?.loyalty?.rewardName || 'a free visit'}.
            </p>
            <button type="button" onClick={() => setStampBurst(false)} className="mt-5 w-full rounded-2xl bg-orange-500 py-3 text-sm font-black text-white">
              Keep collecting
            </button>
          </div>
        </div>
      )}
      <ReviewPrompt
        open={reviewOpen}
        reviewUrl={reviewHref(activeToken?.business?.googleReviewUrl, activeToken?.business?.googlePlaceId)}
        stamps={activeToken?.loyalty?.stamps}
        goal={activeToken?.loyalty?.stampsForReward}
        rewardName={activeToken?.loyalty?.rewardName}
        onClose={() => setReviewOpen(false)}
      />
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelToken}
        title="Leave the Queue?"
        description="Are you sure you want to cancel your queue token? You will lose your current spot in line."
        confirmLabel="Yes, Leave Queue"
        cancelLabel="Stay in Queue"
        variant="danger"
      />
    </div>
  );
}

function VisitFinished({
  foodBusiness,
  clinicalBusiness,
  reviewUrl,
  stampsHref,
  loyalty,
  onStartAgain,
}: {
  foodBusiness: boolean;
  clinicalBusiness: boolean;
  reviewUrl: string;
  stampsHref: string;
  loyalty?: { stamps?: number; stampsForReward?: number; rewardName?: string } | null;
  onStartAgain: () => void;
}) {
  const stamps = loyalty?.stamps || 0;
  const goal = loyalty?.stampsForReward || 8;
  const full = stamps >= goal;
  return (
    <div className="relative z-10 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-left">
      <div className="flex items-center gap-2 text-emerald-800">
        <CheckCircle2 className="h-5 w-5" />
        <p className="font-black">Visit complete</p>
      </div>
      {foodBusiness ? (
        <div className="mt-3">
          <p className="text-sm font-bold text-emerald-950">
            {full
              ? `Your card is full: ${stamps} of ${goal}. Show this phone at the counter and collect ${loyalty?.rewardName || 'your free dish'}.`
              : `You have ${stamps} of ${goal} stamps toward ${loyalty?.rewardName || 'a reward'}.`}
          </p>
          <Link href={stampsHref} className="mt-3 inline-flex rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">
            Open your stamp card
          </Link>
        </div>
      ) : (
        <p className="mt-3 text-sm text-emerald-900">
          {clinicalBusiness ? 'A Google review helps the clinic. The prompt on this page is the same for every visitor.' : 'A Google review helps the business.'}
        </p>
      )}
      {reviewUrl && (
        <a href={reviewUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex rounded-xl border border-emerald-300 bg-white px-4 py-2.5 text-sm font-bold text-emerald-950">
          Rate on Google
        </a>
      )}
      <button type="button" onClick={onStartAgain} className="mt-3 block w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-black text-white">
        Join the queue again
      </button>
    </div>
  );
}

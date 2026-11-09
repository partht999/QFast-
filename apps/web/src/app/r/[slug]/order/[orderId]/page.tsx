'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  Clock,
  CheckCircle2,
  Bell,
  Receipt,
  Star,
  Users,
  ChevronRight,
  ExternalLink,
  ChefHat,
  Sparkles,
  Heart,
  Droplet,
  Utensils,
  HelpCircle,
  X,
  Share2,
  Gift,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { reviewHref } from '@/lib/google-place';
import { VisitBill } from '@/components/visit-bill';

export default function OrderTrackingPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const orderId = params?.orderId as string;

  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [assistanceMsg, setAssistanceMsg] = useState('');
  const [showCallWaiterModal, setShowCallWaiterModal] = useState(false);
  const [showSplitBillModal, setShowSplitBillModal] = useState(false);
  const [splitCount, setSplitCount] = useState(2);
  const [rating, setRating] = useState(5);
  const [tags, setTags] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const apiUrl = getApiUrl();

  const fetchOrder = async () => {
    try {
      const res = await fetch(`${apiUrl}/api/v1/orders/public/${orderId}`);
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 4000);
    return () => clearInterval(interval);
  }, [orderId]);

  const askStaff = async (kind: 'waiter' | 'bill', reason?: string) => {
    setShowCallWaiterModal(false);
    try {
      await fetch(`${apiUrl}/api/v1/orders/public/${orderId}/help`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      });
      setAssistanceMsg(
        kind === 'bill'
          ? 'The host has your bill request.'
          : `The host knows you need someone${reason ? ` for ${reason}` : ''}.`,
      );
    } catch {
      setAssistanceMsg('Could not reach the host. Please wave someone down.');
    }
    setTimeout(() => setAssistanceMsg(''), 6000);
  };

  const handleWaiterRequest = (reason: string) => {
    void askStaff('waiter', reason);
  };

  const handleRequestBill = () => {
    void askStaff('bill');
  };

  const toggleTag = (t: string) => {
    setTags((prev) =>
      prev.includes(t) ? prev.filter((item) => item !== t) : [...prev, t],
    );
  };

  const handleSubmitFeedback = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingFeedback(true);

    try {
      await fetch(`${apiUrl}/api/v1/reviews/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug: slug,
          orderId,
          rating,
          tags,
          comment: feedbackComment,
          customerPhone: order?.customerPhone,
        }),
      });
      setFeedbackSubmitted(true);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingFeedback(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-500 tracking-wide uppercase">Locating order status...</p>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center max-w-sm bg-white p-8 rounded-3xl border border-neutral-100 shadow-sm">
          <Receipt className="w-12 h-12 text-neutral-300 mx-auto mb-3" />
          <h2 className="text-base font-extrabold text-neutral-800">Order not found</h2>
          <p className="text-xs text-neutral-400 mt-1">Please ask your server for assistance.</p>
        </div>
      </div>
    );
  }

  const isTakeaway = order.source === 'TAKEAWAY';
  const steps = isTakeaway
    ? [
        { key: 'PENDING', label: 'Order received', desc: 'The kitchen has your takeaway', icon: '📝' },
        { key: 'PREPARING', label: 'Cooking', desc: 'Your food is being prepared', icon: '🍳' },
        { key: 'READY', label: 'Ready to collect', desc: 'Come to the counter', icon: '🔔' },
        { key: 'COMPLETED', label: 'Collected', desc: 'Your bill is ready to download', icon: '✨' },
      ]
    : [
        { key: 'PENDING', label: 'Order Received', desc: 'Sent to kitchen display', icon: '📝' },
        { key: 'PREPARING', label: 'In Kitchen', desc: 'Chef is cooking your meal', icon: '🍳' },
        { key: 'READY', label: 'Ready to Serve', desc: 'On the way to your table', icon: '🔔' },
        { key: 'COMPLETED', label: 'Served', desc: 'Enjoy your meal!', icon: '✨' },
      ];

  const getStepStatus = (stepKey: string) => {
    const statusOrder = ['PENDING', 'ACCEPTED', 'PREPARING', 'READY', 'COMPLETED'];
    const currentIdx = statusOrder.indexOf(order.status === 'ACCEPTED' ? 'PREPARING' : order.status);
    const targetIdx = statusOrder.indexOf(stepKey);

    if (currentIdx > targetIdx) return 'done';
    if (currentIdx === targetIdx) return 'current';
    return 'upcoming';
  };

  const isCompleted = order.status === 'COMPLETED';
  const totalAmount = Number(order.totalAmount || 0);
  const perPersonSplit = Math.ceil(totalAmount / splitCount);

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-20">
      {/* Top Bar */}
      <header className="px-5 py-3.5 bg-white/95 backdrop-blur-md border-b border-neutral-200 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-2.5">
          <Link
            href={order.table?.name ? `/r/${slug}/table/${encodeURIComponent(order.table.name)}` : `/r/${slug}/join`}
            className="text-lg font-black text-orange-600"
          >
            ⚡ Qfast
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="text-xs text-neutral-500 font-semibold">Live Order Tracker</span>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/r/${slug}/loyalty`}
            className="flex items-center gap-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1 rounded-full transition shadow-xs"
          >
            <Gift className="w-3.5 h-3.5 text-orange-600" />
            <span>Rewards</span>
          </Link>
          {order.table?.name ? (
            <span className="text-xs bg-emerald-100 text-emerald-800 font-extrabold px-3 py-1 rounded-full border border-emerald-200/50">
              🍽️ Table {order.table.name}
            </span>
          ) : order.source === 'QUEUE_PREORDER' || order.queueToken ? (
            <span className="text-xs bg-amber-100 text-amber-900 font-extrabold px-3 py-1 rounded-full border border-amber-300">
              ⏳ Queue Pre-order {order.queueToken?.tokenNumber ? `#${order.queueToken.tokenNumber}` : ''}
            </span>
          ) : (
            <span className="text-xs bg-purple-100 text-purple-800 font-extrabold px-3 py-1 rounded-full border border-purple-200/50">
              🛍️ Takeaway / Parcel
            </span>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md w-full mx-auto p-4 space-y-4">
        {/* Assistance Toast */}
        {assistanceMsg && (
          <div className="bg-neutral-900 text-white rounded-2xl p-4 text-xs font-semibold shadow-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-3">
            <Bell className="w-4 h-4 text-orange-400 shrink-0 animate-bounce" />
            <span className="flex-1">{assistanceMsg}</span>
          </div>
        )}

        {isTakeaway && order.status === 'READY' && (
          <div className="rounded-3xl border-2 border-emerald-400 bg-emerald-50 p-5 text-center">
            <p className="text-lg font-black text-emerald-950">Your takeaway is ready</p>
            <p className="mt-1 text-sm text-emerald-800">Collect it at the counter. The bill is below.</p>
          </div>
        )}
        {isTakeaway && order.status === 'COMPLETED' && (
          <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-5 text-center">
            <p className="text-lg font-black text-emerald-950">Collected</p>
            <p className="mt-1 text-sm text-emerald-800">Download the bill whenever you need it.</p>
          </div>
        )}

        {/* Live Order Timeline Card */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/80 shadow-xs">
          {/* Queue Status Callout */}
          {(order.source === 'QUEUE_PREORDER' || order.queueToken) && (
            order.table?.name ? (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 text-xs text-emerald-900 mb-4 flex items-center gap-2">
                <span className="text-base">🍽️</span>
                <span><strong>Seated at Table {order.table.name}!</strong> Your pre-ordered dishes are being served to your table now.</span>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs text-amber-950 mb-4 flex items-center gap-2">
                <span className="text-base">⏳</span>
                <span><strong>Dine-in Pre-order:</strong> The kitchen is cooking your meal now while you wait for your table. It will be served once you are seated!</span>
              </div>
            )
          )}
          <div className="flex items-center justify-between mb-5">
            <div>
              <span className="text-[11px] font-black text-orange-600 uppercase tracking-wider block">
                {order.business?.name}
              </span>
              <h2 className="text-xl font-black text-neutral-900 mt-0.5">
                Ticket #{order.id.slice(-6).toUpperCase()}
              </h2>
            </div>
            <span
              className={`text-xs font-extrabold px-3.5 py-1.5 rounded-full ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-orange-100 text-orange-800 border border-orange-200 animate-pulse'
              }`}
            >
              {order.status}
            </span>
          </div>

          {/* Progress Timeline Steps */}
          <div className="space-y-4 pt-1">
            {steps.map((s) => {
              const st = getStepStatus(s.key);
              return (
                <div key={s.key} className="flex items-center gap-3.5">
                  <div
                    className={`w-9 h-9 rounded-2xl flex items-center justify-center text-sm font-extrabold transition-all shadow-xs ${
                      st === 'done'
                        ? 'bg-emerald-500 text-white'
                        : st === 'current'
                        ? 'bg-orange-500 text-white ring-4 ring-orange-100 animate-pulse'
                        : 'bg-neutral-100 text-neutral-400'
                    }`}
                  >
                    {st === 'done' ? <CheckCircle2 className="w-5 h-5" /> : s.icon}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`text-xs font-bold leading-tight ${
                        st === 'current'
                          ? 'text-orange-600 font-black'
                          : st === 'done'
                          ? 'text-neutral-900 font-bold'
                          : 'text-neutral-400'
                      }`}
                    >
                      {s.label}
                    </p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">{s.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick Table Service Action Buttons */}
          {!isCompleted && !isTakeaway && (
            <div className="grid grid-cols-2 gap-2.5 pt-5 border-t border-neutral-100 mt-6">
              <button
                onClick={() => setShowCallWaiterModal(true)}
                className="bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-bold py-2.5 px-3 rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 border border-neutral-200/70"
              >
                <Bell className="w-3.5 h-3.5 text-orange-600" />
                <span>Call Waiter</span>
              </button>

              <button
                onClick={handleRequestBill}
                className="bg-neutral-50 hover:bg-neutral-100 text-neutral-800 font-bold py-2.5 px-3 rounded-2xl text-xs transition-colors flex items-center justify-center gap-2 border border-neutral-200/70"
              >
                <Receipt className="w-3.5 h-3.5 text-neutral-600" />
                <span>Request Bill</span>
              </button>
            </div>
          )}
        </div>

        {/* Share Live Tracker with Tablemates */}
        <div className="flex items-center justify-between gap-2 bg-white rounded-2xl p-3.5 border border-neutral-200/80 shadow-2xs text-xs">
          <div className="flex items-center gap-2">
            <Share2 className="w-4 h-4 text-orange-600" />
            <span className="font-bold text-neutral-800">Share live order status:</span>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={`https://wa.me/?text=${encodeURIComponent(`Follow our live food order at ${order.business?.name || 'the restaurant'}: ${typeof window !== 'undefined' ? window.location.href : ''}`)}`}
              target="_blank"
              rel="noreferrer"
              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors flex items-center gap-1"
            >
              <span>WhatsApp</span>
            </a>
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  navigator.clipboard.writeText(window.location.href);
                  setAssistanceMsg('Tracking link copied to clipboard!');
                  setTimeout(() => setAssistanceMsg(''), 4000);
                }
              }}
              className="bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold px-3 py-1.5 rounded-xl transition-colors"
            >
              Copy
            </button>
          </div>
        </div>

        <div id="bill">
          <VisitBill
            title={isTakeaway ? 'Takeaway bill' : 'Your bill'}
            businessName={order.business?.name}
            detail={isTakeaway ? 'Collect at the counter' : order.table?.name ? `Table ${order.table.name}` : 'Dine in'}
            downloadName={`bill-${order.id.slice(-6)}`}
            lines={(order.items || []).map((item: any) => ({
              id: item.id,
              name: item.menuItem?.name || 'Item',
              quantity: item.quantity,
              amount: Number(item.totalPrice || 0),
              note: item.specialNote,
            }))}
            subtotal={Number(order.subtotal || 0)}
            tax={Number(order.taxAmount || 0)}
            total={totalAmount}
            payments={order.payments || []}
          />
        </div>

        {order.queueTokenId && (
          <Link href={`/r/${slug}/join`} className="block rounded-3xl bg-orange-500 px-5 py-4 text-center text-sm font-black text-white">
            Back to your queue
          </Link>
        )}

        {/* Review & Feedback Card (Always available, highlighted upon completion) */}
        <div className="bg-white rounded-3xl p-6 border-2 border-orange-200/80 shadow-sm space-y-4">
          <div className="text-center">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-2">
              <Star className="w-5 h-5 fill-amber-400" />
            </div>
            <h3 className="font-black text-base text-neutral-900">How is your experience?</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Share your feedback or leave a public Google review.
            </p>
          </div>

          {/* Official Google Review Button (Strictly un-gated, compliant with Google Review Guidelines) */}
          <a
            href={reviewHref(order.business?.googleReviewUrl, order.business?.googlePlaceId) || undefined}
            target="_blank"
            rel="noreferrer"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 rounded-2xl transition-all shadow-xs flex items-center justify-center gap-2 text-xs active:scale-98"
          >
            <span>Rate us on Google Maps</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Private Feedback Form */}
          {feedbackSubmitted ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-600 mx-auto mb-1.5" />
              <p className="font-bold text-xs">Thank you for your valuable feedback!</p>
              <p className="text-[11px] text-emerald-700/80 mt-0.5">Our restaurant manager has received your note.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitFeedback} className="space-y-3.5 pt-3 border-t border-neutral-100">
              <div className="text-center">
                <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Private Rating
                </span>
                <div className="flex justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className="p-1 transition-transform hover:scale-125"
                    >
                      <Star
                        className={`w-7 h-7 ${
                          star <= rating
                            ? 'text-amber-400 fill-amber-400'
                            : 'text-neutral-200'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              {/* Review Tags */}
              <div>
                <span className="block text-[11px] font-bold text-neutral-400 uppercase tracking-wider mb-2">
                  Highlights
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    'Delicious Food',
                    'Super Fast',
                    'Friendly Staff',
                    'Great Ambience',
                    'Hygienic',
                    'Good Value',
                  ].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => toggleTag(t)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-semibold transition-all ${
                        tags.includes(t)
                          ? 'bg-orange-500 text-white border-orange-500 shadow-2xs'
                          : 'bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <textarea
                  rows={2}
                  value={feedbackComment}
                  onChange={(e) => setFeedbackComment(e.target.value)}
                  placeholder="Suggestions or compliments for the team?"
                  className="w-full border border-neutral-200 rounded-xl p-3 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
                />
              </div>

              <button
                type="submit"
                disabled={submittingFeedback}
                className="w-full bg-neutral-900 hover:bg-black text-white font-extrabold py-3 rounded-xl text-xs transition-colors shadow-xs"
              >
                {submittingFeedback ? 'Submitting…' : 'Send Private Feedback'}
              </button>
            </form>
          )}
        </div>
      </main>

      {/* Call Waiter Modal */}
      {showCallWaiterModal && (
        <div className="fixed inset-0 bg-neutral-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-sm text-neutral-900">How can we help?</h3>
              </div>
              <button
                onClick={() => setShowCallWaiterModal(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-400 hover:text-neutral-700 flex items-center justify-center text-xs font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { label: 'Drinking Water', icon: '💧' },
                { label: 'Extra Cutlery', icon: '🍴' },
                { label: 'Napkins / Tissue', icon: '🧻' },
                { label: 'Clean Table', icon: '🧹' },
                { label: 'Order More Items', icon: '📖' },
                { label: 'General Assistance', icon: '🙋‍♂️' },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => handleWaiterRequest(item.label)}
                  className="p-3 bg-neutral-50 hover:bg-orange-50 border border-neutral-200/80 hover:border-orange-300 rounded-2xl text-left transition-all group"
                >
                  <span className="text-xl block mb-1">{item.icon}</span>
                  <span className="text-xs font-bold text-neutral-800 group-hover:text-orange-950 block">
                    {item.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Split Bill Calculator Modal */}
      {showSplitBillModal && (
        <div className="fixed inset-0 bg-neutral-950/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 text-center">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-left">
                <Users className="w-5 h-5 text-orange-600" />
                <h3 className="font-extrabold text-sm text-neutral-900">Split Bill Calculator</h3>
              </div>
              <button
                onClick={() => setShowSplitBillModal(false)}
                className="w-7 h-7 rounded-full bg-neutral-100 text-neutral-400 hover:text-neutral-700 flex items-center justify-center text-xs font-bold"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-orange-50/70 border border-orange-200/80 rounded-2xl p-4">
              <span className="text-xs font-bold text-orange-800/80 uppercase tracking-wide">
                Each Person Pays
              </span>
              <div className="text-3xl font-black text-orange-600 mt-1">
                ₹{perPersonSplit.toFixed(2)}
              </div>
              <p className="text-[11px] text-neutral-500 mt-0.5">
                Total ₹{totalAmount.toFixed(2)} split between {splitCount} guests
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-xs font-bold text-neutral-500 block">Number of People</span>
              <div className="flex items-center justify-center gap-3">
                {[2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSplitCount(num)}
                    className={`w-10 h-10 rounded-xl font-bold text-sm transition-all border ${
                      splitCount === num
                        ? 'bg-orange-500 text-white border-orange-500 shadow-xs'
                        : 'bg-white text-neutral-700 border-neutral-200 hover:border-neutral-300'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowSplitBillModal(false)}
              className="w-full bg-neutral-900 hover:bg-black text-white font-bold py-3 rounded-xl text-xs transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Clock,
  Sparkles,
  ArrowRight,
  X,
  UtensilsCrossed,
  CheckCircle2,
  Flame,
  Leaf,
  Gift,
} from 'lucide-react';
import { BackLink, releaseOverlayHistory, useOverlayHistory } from '@/components/navigation-memory';
import { getApiUrl } from '@/lib/api';
import { isIndianMobile, localMobile } from '@/lib/phone';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  isVeg: boolean;
  specialNote?: string;
}

export default function TableOrderPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params?.slug as string;
  const tableNumber = decodeURIComponent((params?.tableNumber as string) || '');
  const tokenParam = searchParams?.get('token') || null;

  const isQueueParam = tableNumber.toLowerCase() === 'queue' || Boolean(tokenParam);
  const isTakeawayParam = tableNumber.toLowerCase() === 'takeaway';
  const isFixedTable = !isQueueParam && !isTakeawayParam && tableNumber.length > 0;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [orderSource, setOrderSource] = useState<'TABLE_QR' | 'QUEUE_PREORDER' | 'TAKEAWAY'>(
    isQueueParam ? 'QUEUE_PREORDER' : isTakeawayParam ? 'TAKEAWAY' : 'TABLE_QR'
  );
  const [queueToken, setQueueToken] = useState<any>(null);
  const [tipPercentage, setTipPercentage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const orderKey = useRef('');
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [detailItem, setDetailItem] = useState<any | null>(null);
  useOverlayHistory(Boolean(detailItem), () => setDetailItem(null));
  useOverlayHistory(isCartOpen, () => setIsCartOpen(false));

  const apiUrl = getApiUrl();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

  useEffect(() => {
    if (isFixedTable) return;
    const tokenId = tokenParam || (typeof window !== 'undefined' ? localStorage.getItem(`qfast_token_${slug}`) : null);
    if (tokenId) {
      fetch(`${apiUrl}/api/v1/queue/public/token/${tokenId}`)
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data && (data.status === 'WAITING' || data.status === 'CALLED' || data.status === 'SEATED')) {
            setQueueToken(data);
            if (isQueueParam || !isFixedTable) {
              setOrderSource('QUEUE_PREORDER');
            }
            if (data.customerName && !customerName) setCustomerName(data.customerName);
            if (data.customerPhone && !customerPhone) setCustomerPhone(data.customerPhone);
          }
        })
        .catch(() => {});
    }
  }, [slug, tokenParam, isQueueParam, isFixedTable, apiUrl]);

  useEffect(() => {
    fetch(`${apiUrl}/api/v1/business/public/${slug}`)
      .then((res) => {
        if (!res.ok) throw new Error('Restaurant not found');
        return res.json();
      })
      .then((data) => {
        setRestaurant(data);
        const menu = data.menus?.[0];
        if (menu?.categories) {
          setCategories(menu.categories);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Could not load restaurant menu');
      })
      .finally(() => setLoading(false));
  }, [slug, apiUrl]);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i,
        );
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
          isVeg: item.isVeg,
        },
      ];
    });
    showToast(`Added ${item.name} to order`);
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((i) =>
          i.id === itemId ? { ...i, quantity: i.quantity - 1 } : i,
        );
      }
      return prev.filter((i) => i.id !== itemId);
    });
  };

  const deleteFromCart = (itemId: string) => {
    setCart((prev) => prev.filter((i) => i.id !== itemId));
  };

  const getQuantity = (itemId: string) => {
    return cart.find((i) => i.id === itemId)?.quantity || 0;
  };

  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const gstAmount = Math.round(subtotal * 0.05 * 100) / 100;
  const tipAmount = tipPercentage > 0 ? Math.round((subtotal * tipPercentage) / 100) : 0;
  const total = subtotal + gstAmount + tipAmount;
  const totalCount = cart.reduce((acc, item) => acc + item.quantity, 0);

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (orderSource === 'TABLE_QR' && (!customerName.trim() || !isIndianMobile(customerPhone))) {
      setError('Enter your name and a 10-digit mobile number. Stamps are saved to that number.');
      return;
    }
    if (!orderKey.current) orderKey.current = crypto.randomUUID();
    setPlacingOrder(true);
    setError('');

    try {
      const resolvedQueueTokenId =
        orderSource === 'QUEUE_PREORDER'
          ? (queueToken?.id || tokenParam || (typeof window !== 'undefined' ? localStorage.getItem(`qfast_token_${slug}`) : undefined) || undefined)
          : undefined;

      const res = await fetch(`${apiUrl}/api/v1/orders/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug: slug,
          source: orderSource,
          tableName: orderSource === 'TABLE_QR' ? tableNumber : undefined,
          queueTokenId: resolvedQueueTokenId,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() ? localMobile(customerPhone) : undefined,
          specialInstructions: specialInstructions.trim() || undefined,
          paymentMethod: 'UPI_AT_COUNTER',
          tipAmount,
          idempotencyKey: orderKey.current,
          items: cart.map((i) => ({
            menuItemId: i.id,
            quantity: i.quantity,
            unitPrice: i.price,
            specialNote: i.specialNote,
          })),
        }),
      });

      const orderData = await res.json();
      if (!res.ok) throw new Error(orderData.message || 'Failed to submit order');

      if (orderSource === 'TAKEAWAY' && orderData.id) {
        localStorage.setItem(`qfast_takeaway_${slug}`, orderData.id);
      }
      releaseOverlayHistory();
      const destination =
        orderSource === 'QUEUE_PREORDER' || resolvedQueueTokenId
          ? `/r/${slug}/join`
          : `/r/${slug}/order/${orderData.id}`;
      window.location.assign(destination);
    } catch (err: any) {
      setError(err.message || 'Could not place order');
      setPlacingOrder(false);
    }
  };

  if (!loading && restaurant && restaurant.visitsOpen === false) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-neutral-50 p-6 text-center">
        <div className="max-w-sm rounded-3xl bg-white p-6 shadow-sm">
          <h1 className="text-xl font-black">{restaurant.name}</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">Ordering is paused because the business plan has expired. Please ask the counter.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-neutral-500 tracking-wide uppercase">Preparing digital menu...</p>
        </div>
      </div>
    );
  }

  const allItems = categories.flatMap((c) =>
    (c.items || []).map((i: any) => ({ ...i, categoryName: c.name })),
  );

  const filteredItems = allItems.filter((item) => {
    if (vegOnly && !item.isVeg) return false;
    if (selectedCategory !== 'ALL' && item.categoryName !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      if (!matchName && !matchDesc) return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-32">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-neutral-900 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-xl flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white/95 backdrop-blur-md border-b border-neutral-200 sticky top-0 z-20 shadow-xs">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3 px-4 py-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {!isFixedTable && <BackLink fallback={`/r/${slug}/join`} />}
            {restaurant?.logoUrl ? (
              <img src={restaurant.logoUrl} alt="" className="h-11 w-11 shrink-0 rounded-xl object-cover" />
            ) : (
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
                <UtensilsCrossed className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-neutral-950 line-clamp-1">
                  {restaurant?.name || 'Restaurant'}
                </h1>
                {orderSource === 'QUEUE_PREORDER' ? (
                  <span className="text-[11px] bg-amber-100 text-amber-900 font-extrabold px-2.5 py-0.5 rounded-full border border-amber-300 shrink-0">
                    Queue #{queueToken?.tokenNumber || 'Waitlist'}
                  </span>
                ) : orderSource === 'TAKEAWAY' ? (
                  <span className="text-[11px] bg-purple-100 text-purple-900 font-extrabold px-2.5 py-0.5 rounded-full border border-purple-300 shrink-0">
                    Takeaway
                  </span>
                ) : (
                  <span className="text-[11px] bg-orange-100 text-orange-800 font-extrabold px-2.5 py-0.5 rounded-full border border-orange-200/60 shrink-0">
                    Table {tableNumber}
                  </span>
                )}
              </div>
              {restaurant?.instagramHandle && (
                <a href={`https://instagram.com/${restaurant.instagramHandle}`} target="_blank" rel="noreferrer" className="text-[11px] font-bold text-orange-700">
                  Follow @{restaurant.instagramHandle}
                </a>
              )}
              <p className="text-[11px] text-neutral-400 font-medium">
                {orderSource === 'QUEUE_PREORDER'
                  ? 'Dine-in Pre-order · Served when table is ready'
                  : orderSource === 'TAKEAWAY'
                  ? 'Takeaway Menu · Pick up at counter'
                  : 'Digital Dine-in Menu'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/r/${slug}/loyalty`}
              aria-label="View stamp card"
              title="Stamp card"
              className="rounded-full border border-amber-200 bg-amber-50 p-2 text-amber-800 hover:bg-amber-100"
            >
              <Gift className="h-4 w-4" />
            </Link>
            <button
              onClick={() => setVegOnly(!vegOnly)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${vegOnly
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                  : 'bg-white text-neutral-600 border-neutral-200 hover:border-neutral-300'
                }`}
            >
              <Leaf className="w-3.5 h-3.5" />
              Veg Only
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto px-4 pb-2.5">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dishes, drinks, starters..."
              className="w-full bg-neutral-100/80 border border-neutral-200/80 rounded-xl pl-9 pr-8 py-3 text-base focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-neutral-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 text-neutral-400 hover:text-neutral-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Horizontal Category Carousel */}
        <div className="max-w-2xl mx-auto px-4 overflow-x-auto no-scrollbar flex items-center gap-2 py-2 border-t border-neutral-100">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`min-h-11 shrink-0 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === 'ALL'
                ? 'bg-orange-500 text-white shadow-xs'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
              }`}
          >
            All Items ({allItems.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.name)}
              className={`min-h-11 shrink-0 px-4 py-2.5 rounded-full text-sm font-bold whitespace-nowrap transition-all ${selectedCategory === cat.name
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
                }`}
            >
              {cat.name} ({cat.items?.length || 0})
            </button>
          ))}
        </div>
      </header>

      {/* Queue Pre-order Info Banner */}
      {orderSource === 'QUEUE_PREORDER' && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-950">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-base">⏳</span>
              <span>
                {queueToken?.status === 'SEATED' ? (
                  <>
                    <strong>At your table{queueToken.table?.name ? ` ${queueToken.table.name}` : ''}.</strong> These items are added to the same bill.
                  </>
                ) : (
                  <>
                    <strong>Order while you wait.</strong> You go back to the queue after this, and the food is served at your table.
                  </>
                )}
              </span>
            </div>
            <Link
              href={`/r/${slug}/join`}
              className="text-[11px] font-bold text-amber-800 underline hover:text-amber-950 shrink-0 ml-2"
            >
              Waitlist status
            </Link>
          </div>
        </div>
      )}

      {/* Menu Item Cards */}
      <main className="max-w-2xl mx-auto space-y-3 p-4 pb-28">
        {filteredItems.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 text-center text-neutral-400 border border-neutral-100 shadow-xs mt-4">
            <UtensilsCrossed className="w-10 h-10 text-neutral-300 mx-auto mb-2" />
            <p className="font-bold text-neutral-700 text-sm">No dishes match your search</p>
            <p className="text-xs text-neutral-400 mt-1">Try clearing your filters or search terms.</p>
            {(searchQuery || vegOnly || selectedCategory !== 'ALL') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setVegOnly(false);
                  setSelectedCategory('ALL');
                }}
                className="mt-4 text-xs font-bold text-orange-600 hover:underline"
              >
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          filteredItems.map((item) => {
            const qty = getQuantity(item.id);
            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl p-4 border transition-all shadow-xs ${qty > 0 ? 'border-orange-300 ring-1 ring-orange-200/50' : 'border-neutral-200/70 hover:border-orange-200'
                  }`}
              >
                <div className="flex items-start gap-3">
                  {item.imageUrl ? (
                    <button type="button" onClick={() => setDetailItem(item)} className="shrink-0">
                      <img src={item.imageUrl} alt="" className="h-24 w-24 rounded-2xl object-cover" />
                    </button>
                  ) : (
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-neutral-100 text-neutral-300">
                      <UtensilsCrossed className="h-6 w-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      {/* Dietary Dot Indicator */}
                      <span
                        className={`w-4 h-4 rounded-md flex items-center justify-center border text-[8px] font-bold ${item.isVeg
                            ? 'border-emerald-600 text-emerald-600 bg-emerald-50'
                            : 'border-red-600 text-red-600 bg-red-50'
                          }`}
                        title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                      >
                        ●
                      </span>
                      <h3 className="font-bold text-neutral-950 text-base leading-snug">{item.name}</h3>
                      {item.mostOrdered && (
                        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-800">
                          Most ordered
                        </span>
                      )}
                      {item.badge && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-neutral-700">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    <div className="font-black text-base text-neutral-950 mb-1">
                      ₹{Number(item.price).toFixed(2)}
                    </div>

                    {item.description && (
                      <p className="line-clamp-2 pr-2 text-sm leading-5 text-neutral-600">
                        {item.description}
                      </p>
                    )}
                    {item.servedAs && <p className="mt-1 text-xs font-semibold text-neutral-700">Served: {item.servedAs}</p>}
                    <button type="button" onClick={() => setDetailItem(item)} className="mt-2 text-xs font-bold text-orange-700">
                      See how it’s served
                    </button>

                    <div className="flex items-center gap-3 mt-2 text-[11px] text-neutral-400">
                      {item.prepTimeMinutes && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-neutral-400" />
                          ~{item.prepTimeMinutes} mins
                        </span>
                      )}
                      <span className="text-neutral-300">•</span>
                      <span className="text-neutral-400">{item.categoryName}</span>
                    </div>
                  </div>

                  {/* Add to Cart / Stepper Controller */}
                  <div className="flex flex-col items-center justify-center shrink-0">
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex min-h-11 items-center gap-1.5 rounded-xl border border-orange-200 bg-orange-50 px-4 text-sm font-extrabold text-orange-700 shadow-xs transition-all hover:border-orange-500 hover:bg-orange-500 hover:text-white active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    ) : (
                      <div className="flex min-h-11 items-center gap-1 rounded-xl bg-orange-500 px-1.5 text-white shadow-sm">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="flex h-9 w-9 items-center justify-center rounded font-bold hover:bg-orange-600"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-5 text-center text-sm font-black">{qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="flex h-9 w-9 items-center justify-center rounded font-bold hover:bg-orange-600"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/95 backdrop-blur-md border-t border-neutral-200 z-30 shadow-2xl animate-in slide-in-from-bottom-3 duration-200">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-neutral-500">
                  {totalCount} {totalCount === 1 ? 'item' : 'items'}
                </span>
                <span className="text-neutral-300">•</span>
                <span className="text-xs text-orange-600 font-bold">Table {tableNumber}</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-black text-neutral-900">₹{total.toFixed(2)}</span>
                <span className="text-[10px] text-neutral-400 font-medium">(incl. GST)</span>
              </div>
            </div>

            <button
              onClick={() => setIsCartOpen(true)}
              className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold px-6 py-3.5 rounded-2xl shadow-md transition-all flex items-center gap-2 text-sm active:scale-98"
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Review Order</span>
              <ArrowRight className="w-4 h-4 ml-0.5" />
            </button>
          </div>
        </div>
      )}

      {/* Cart Drawer / Bottom Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 bg-neutral-950/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom-5 duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-neutral-900 text-sm">Table Order Review</h3>
                  <p className="text-xs text-neutral-400">
                    {restaurant?.name} • <span className="font-semibold text-neutral-700">{tableNumber}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 text-neutral-500 hover:text-neutral-800 flex items-center justify-center text-sm font-bold transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cart Items List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1 divide-y divide-neutral-100">
              {cart.map((item) => (
                <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[8px] ${item.isVeg ? 'text-emerald-600' : 'text-red-600'}`}>●</span>
                      <h4 className="font-bold text-xs text-neutral-800 leading-tight">{item.name}</h4>
                    </div>
                    <span className="text-[11px] text-neutral-400 mt-0.5 block">
                      ₹{item.price.toFixed(2)} × {item.quantity} = ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2 bg-neutral-100 rounded-lg px-2 py-1">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-neutral-900 font-bold"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => addToCart(item)}
                        className="w-5 h-5 flex items-center justify-center text-neutral-600 hover:text-neutral-900 font-bold"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => deleteFromCart(item.id)}
                      className="text-neutral-300 hover:text-red-500 p-1 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {/* Order Info & Options Form */}
              <form onSubmit={handlePlaceOrder} className="pt-4 space-y-3.5">
                {/* Dining Option Toggle if not a fixed table QR code */}
                {!isFixedTable && !isTakeawayParam && !queueToken && !tokenParam && (
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                      Dining Type
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setOrderSource('QUEUE_PREORDER')}
                        className={`p-2.5 rounded-2xl border text-left text-xs transition-all ${
                          orderSource === 'QUEUE_PREORDER'
                            ? 'border-orange-500 bg-orange-50/70 text-orange-900 shadow-2xs'
                            : 'border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                          <span>⏳ Dine-in Pre-order</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          Waiting in queue / for table
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setOrderSource('TAKEAWAY')}
                        className={`p-2.5 rounded-2xl border text-left text-xs transition-all ${
                          orderSource === 'TAKEAWAY'
                            ? 'border-orange-500 bg-orange-50/70 text-orange-900 shadow-2xs'
                            : 'border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300'
                        }`}
                      >
                        <div className="font-bold text-neutral-900 flex items-center gap-1.5">
                          <span>🛍️ Takeaway / Parcel</span>
                        </div>
                        <span className="text-[10px] text-neutral-500 block mt-0.5">
                          Pick up & pack to go
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Priya Sharma"
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                      Mobile Number
                    </label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      inputMode="numeric"
                      className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1">
                    Special Cooking Request / Allergies
                  </label>
                  <input
                    type="text"
                    value={specialInstructions}
                    onChange={(e) => setSpecialInstructions(e.target.value)}
                    placeholder="e.g. Medium spicy, no garlic, extra napkins"
                    className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>

                {/* Optional Tip Selector */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Add Staff Tip (Optional)</span>
                    {tipAmount > 0 && <span className="text-orange-600 font-bold">+₹{tipAmount}</span>}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[0, 5, 10, 15].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setTipPercentage(pct)}
                        className={`py-1.5 text-xs font-bold rounded-xl border transition-all ${tipPercentage === pct
                            ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-2xs'
                            : 'bg-white border-neutral-200 text-neutral-600 hover:border-neutral-300'
                          }`}
                      >
                        {pct === 0 ? 'No Tip' : `${pct}%`}
                      </button>
                    ))}
                  </div>
                </div>

                <p className="rounded-2xl bg-amber-50 px-3 py-3 text-xs leading-5 text-amber-950">
                  {orderSource === 'QUEUE_PREORDER'
                    ? 'This stays on your visit. You pay by UPI, cash, or card after you are seated. Adding more items makes the bill due again.'
                    : 'The bill stays due until you or the counter record UPI, cash, or card. Adding more items makes a paid bill due again.'}
                </p>

                {/* Detailed Bill Breakdown */}
                <div className="bg-neutral-50 rounded-2xl p-3.5 border border-neutral-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-neutral-500">
                    <span>Subtotal</span>
                    <span>₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-neutral-500">
                    <span>GST (5%)</span>
                    <span>₹{gstAmount.toFixed(2)}</span>
                  </div>
                  {tipAmount > 0 && (
                    <div className="flex justify-between text-neutral-500">
                      <span>Staff Tip</span>
                      <span>₹{tipAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-neutral-900 pt-2 border-t border-neutral-200">
                    <span>Grand Total</span>
                    <span>₹{total.toFixed(2)}</span>
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs font-semibold border border-red-200">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={placingOrder}
                  className="w-full bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 text-white font-extrabold py-3.5 rounded-2xl transition-all shadow-md text-sm mt-1 flex items-center justify-center gap-2"
                >
                  {placingOrder ? (
                    <span>{orderSource === 'QUEUE_PREORDER' ? 'Saving your pre-order…' : 'Sending to Kitchen…'}</span>
                  ) : (
                    <>
                      <span>
                        {orderSource === 'QUEUE_PREORDER'
                          ? `Add to pre-order (₹${total.toFixed(2)})`
                          : orderSource === 'TAKEAWAY'
                            ? `Place takeaway order (₹${total.toFixed(2)})`
                            : `Place order (₹${total.toFixed(2)})`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      {detailItem && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-neutral-950/50 p-4 sm:items-center">
          <div className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl">
            {detailItem.imageUrl && (
              <img src={detailItem.imageUrl} alt="" className="h-48 w-full object-cover" />
            )}
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black">{detailItem.name}</h2>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {detailItem.mostOrdered && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-orange-800">Most ordered</span>}
                    {detailItem.badge && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-neutral-700">{detailItem.badge}</span>}
                  </div>
                  <p className="mt-1 text-sm font-bold">₹{Number(detailItem.price).toFixed(0)}</p>
                </div>
                <button type="button" onClick={() => setDetailItem(null)} className="rounded-full bg-neutral-100 p-2">
                  <X className="h-4 w-4" />
                </button>
              </div>
              {detailItem.description && <p className="mt-3 text-sm leading-6 text-neutral-600">{detailItem.description}</p>}
              <p className="mt-3 rounded-2xl bg-orange-50 px-3 py-3 text-sm font-semibold text-orange-950">
                {detailItem.servedAs ? `How it’s served: ${detailItem.servedAs}` : 'The kitchen will confirm how this dish is served.'}
              </p>
              <button
                type="button"
                onClick={() => {
                  addToCart(detailItem);
                  setDetailItem(null);
                }}
                className="mt-4 w-full rounded-2xl bg-orange-500 py-3 text-sm font-black text-white"
              >
                Add to order
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

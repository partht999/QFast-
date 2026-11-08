'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  CreditCard,
  Banknote,
  UtensilsCrossed,
  CheckCircle2,
  Flame,
  Leaf,
  Gift,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';

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
  const slug = params?.slug as string;
  const tableNumber = decodeURIComponent((params?.tableNumber as string) || '');

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
  const [paymentMethod, setPaymentMethod] = useState<'UPI_AT_COUNTER' | 'CASH' | 'RAZORPAY_ONLINE'>('UPI_AT_COUNTER');
  const [tipPercentage, setTipPercentage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const router = useRouter();

  const apiUrl = getApiUrl();

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2500);
  };

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
    setPlacingOrder(true);
    setError('');

    try {
      const res = await fetch(`${apiUrl}/api/v1/orders/public`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessSlug: slug,
          source: 'TABLE_QR',
          tableName: tableNumber,
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          specialInstructions: specialInstructions.trim() || undefined,
          paymentMethod,
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

      setCart([]);
      setIsCartOpen(false);
      router.push(`/r/${slug}/order/${orderData.id}`);
    } catch (err: any) {
      setError(err.message || 'Could not place order');
      setPlacingOrder(false);
    }
  };

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
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
              <UtensilsCrossed className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-neutral-900 line-clamp-1">
                  {restaurant?.name || 'Restaurant'}
                </h1>
                <span className="text-[11px] bg-orange-100 text-orange-800 font-extrabold px-2.5 py-0.5 rounded-full border border-orange-200/60 shrink-0">
                  {tableNumber}
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-medium">Digital Dine-in Menu</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/r/${slug}/loyalty`}
              aria-label="View loyalty points and rewards"
              title="Points and rewards"
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
              className="w-full bg-neutral-100/80 border border-neutral-200/80 rounded-xl pl-9 pr-8 py-2 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-neutral-400"
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
            className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === 'ALL'
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === cat.name
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200/80'
                }`}
            >
              {cat.name} ({cat.items?.length || 0})
            </button>
          ))}
        </div>
      </header>

      {/* Menu Item Cards */}
      <main className="max-w-2xl mx-auto p-4 space-y-3">
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
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
                      <h3 className="font-bold text-neutral-900 text-sm leading-snug">{item.name}</h3>
                      {item.isVeg ? (
                        <span className="text-[10px] text-emerald-700 font-semibold hidden sm:inline">Veg</span>
                      ) : (
                        <span className="text-[10px] text-red-700 font-semibold hidden sm:inline">Non-Veg</span>
                      )}
                    </div>

                    <div className="font-black text-sm text-neutral-900 mb-1">
                      ₹{Number(item.price).toFixed(2)}
                    </div>

                    {item.description && (
                      <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2 pr-2">
                        {item.description}
                      </p>
                    )}

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
                        className="bg-orange-50 hover:bg-orange-500 text-orange-600 hover:text-white font-extrabold text-xs px-4 py-2 rounded-xl border border-orange-200 hover:border-orange-500 transition-all shadow-xs active:scale-95 flex items-center gap-1.5"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 bg-orange-500 text-white rounded-xl px-2 py-1 shadow-sm">
                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-base hover:bg-orange-600 rounded transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-black w-4 text-center">{qty}</span>
                        <button
                          onClick={() => addToCart(item)}
                          className="w-6 h-6 flex items-center justify-center font-bold text-base hover:bg-orange-600 rounded transition-colors"
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
                      placeholder="+91 98765 43210"
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

                {/* Payment Option */}
                <div>
                  <label className="block text-[11px] font-bold text-neutral-500 uppercase tracking-wider mb-1.5">
                    Payment Preference
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('UPI_AT_COUNTER')}
                      className={`p-3 rounded-2xl border text-left text-xs transition-all ${paymentMethod === 'UPI_AT_COUNTER'
                          ? 'border-orange-500 bg-orange-50/70 text-orange-900 shadow-2xs'
                          : 'border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300'
                        }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <Banknote className="w-4 h-4 text-orange-600" />
                        <span className="font-bold text-neutral-900">Pay at Counter</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block">UPI, Cash, or Card</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPaymentMethod('RAZORPAY_ONLINE')}
                      className={`p-3 rounded-2xl border text-left text-xs transition-all ${paymentMethod === 'RAZORPAY_ONLINE'
                          ? 'border-orange-500 bg-orange-50/70 text-orange-900 shadow-2xs'
                          : 'border-neutral-200 text-neutral-600 bg-white hover:border-neutral-300'
                        }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <CreditCard className="w-4 h-4 text-orange-600" />
                        <span className="font-bold text-neutral-900">Pay Online</span>
                      </div>
                      <span className="text-[10px] text-neutral-400 block">UPI &amp; NetBanking</span>
                    </button>
                  </div>
                </div>

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
                    <span>Sending to Kitchen…</span>
                  ) : (
                    <>
                      <span>Place Table Order (₹{total.toFixed(2)})</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

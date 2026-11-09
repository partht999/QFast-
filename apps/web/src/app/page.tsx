'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Search,
  MapPin,
  Clock,
  Users,
  ChevronRight,
  Stethoscope,
  Scissors,
  ClipboardList,
  Wrench,
  UtensilsCrossed,
  Sparkles,
  Star,
  CheckCircle2,
  X,
  Phone,
  ArrowRight,
  ShieldCheck,
  Building2,
  Filter,
  Ticket,
} from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { getApiUrl } from '@/lib/api';

// Fallback seed providers for instant, consumer-grade experience
const FALLBACK_PROVIDERS = [
  {
    id: 'prov_clinic_1',
    name: 'Apollo Family Health & OPD',
    slug: 'apollo-clinic',
    type: 'CLINIC',
    address: '100ft Road, Indiranagar, Bangalore',
    rating: 4.9,
    reviewCount: 142,
    isOpen: true,
    totalWaiting: 3,
    estimatedWaitMin: 15,
    logoUrl: null,
    queues: [
      { id: 'q_c1', name: 'General OPD', doctorName: 'Dr. Sarah Smith', department: 'General Medicine', averageWaitMinutes: 8, waitingCount: 2, isOpen: true },
      { id: 'q_c2', name: 'Pediatrics Clinic', doctorName: 'Dr. Rajesh Rao', department: 'Pediatrics', averageWaitMinutes: 10, waitingCount: 1, isOpen: true },
    ],
  },
  {
    id: 'prov_salon_1',
    name: 'Enrich Hair & Skin Studio',
    slug: 'enrich-salon',
    type: 'SALON',
    address: '5th Block, Koramangala, Bangalore',
    rating: 4.8,
    reviewCount: 98,
    isOpen: true,
    totalWaiting: 2,
    estimatedWaitMin: 12,
    logoUrl: null,
    queues: [
      { id: 'q_s1', name: 'Hair Stylist Counter', serviceName: 'Hair Styling & Cut', averageWaitMinutes: 15, waitingCount: 2, isOpen: true },
      { id: 'q_s2', name: 'Skin & Spa Desk', serviceName: 'Facial & Cleanup', averageWaitMinutes: 20, waitingCount: 0, isOpen: true },
    ],
  },
  {
    id: 'prov_diag_1',
    name: 'Metropolis Diagnostics & Blood Lab',
    slug: 'metropolis-lab',
    type: 'DIAGNOSTIC_CENTRE',
    address: '27th Main, HSR Layout, Bangalore',
    rating: 4.9,
    reviewCount: 210,
    isOpen: true,
    totalWaiting: 4,
    estimatedWaitMin: 8,
    logoUrl: null,
    queues: [
      { id: 'q_d1', name: 'Blood Sample Collection', serviceName: 'Fasting & Routine Blood Tests', averageWaitMinutes: 5, waitingCount: 3, isOpen: true },
      { id: 'q_d2', name: 'X-Ray & ECG Desk', serviceName: 'Digital Imaging', averageWaitMinutes: 10, waitingCount: 1, isOpen: true },
    ],
  },
  {
    id: 'prov_sc_1',
    name: 'Samsung & Apple Care Support',
    slug: 'quick-repair-centre',
    type: 'SERVICE_CENTRE',
    address: 'Brigade Road, Central Bangalore',
    rating: 4.7,
    reviewCount: 76,
    isOpen: true,
    totalWaiting: 5,
    estimatedWaitMin: 18,
    logoUrl: null,
    queues: [
      { id: 'q_sc1', name: 'Device Inspection Counter 1', serviceName: 'Screen & Battery Repair', averageWaitMinutes: 7, waitingCount: 3, isOpen: true },
      { id: 'q_sc2', name: 'Warranty Claims Counter 2', serviceName: 'Replacement & Pickups', averageWaitMinutes: 5, waitingCount: 2, isOpen: true },
    ],
  },
  {
    id: 'prov_rest_1',
    name: 'Banana Leaf Authentic Dining',
    slug: 'banana-leaf',
    type: 'RESTAURANT',
    address: 'Koramangala 4th Block, Bangalore',
    rating: 4.8,
    reviewCount: 320,
    isOpen: true,
    totalWaiting: 6,
    estimatedWaitMin: 20,
    logoUrl: null,
    queues: [
      { id: 'q_r1', name: 'Main Dining Floor', averageWaitMinutes: 10, waitingCount: 6, isOpen: true },
    ],
  },
  {
    id: 'prov_clinic_2',
    name: 'CareWell Dental & Orthodontics',
    slug: 'carewell-dental',
    type: 'CLINIC',
    address: 'CMH Road, Indiranagar, Bangalore',
    rating: 4.9,
    reviewCount: 88,
    isOpen: true,
    totalWaiting: 1,
    estimatedWaitMin: 10,
    logoUrl: null,
    queues: [
      { id: 'q_c3', name: 'Dental Consultation', doctorName: 'Dr. Anita Desai', department: 'Dentistry', averageWaitMinutes: 12, waitingCount: 1, isOpen: true },
    ],
  },
];

const CATEGORIES = [
  { id: 'ALL', label: 'All Services', icon: Sparkles },
  { id: 'CLINIC', label: 'Clinics & Doctors', icon: Stethoscope },
  { id: 'SALON', label: 'Salons & Spas', icon: Scissors },
  { id: 'DIAGNOSTIC_CENTRE', label: 'Diagnostics & Labs', icon: ClipboardList },
  { id: 'SERVICE_CENTRE', label: 'Service & Repair', icon: Wrench },
  { id: 'RESTAURANT', label: 'Dine-in & Cafes', icon: UtensilsCrossed },
];

const LOCATIONS = [
  'All Bangalore Areas',
  'Indiranagar',
  'Koramangala',
  'HSR Layout',
  'Central Bangalore',
  'Whitefield',
];

export default function ConsumerDiscoveryPage() {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('All Bangalore Areas');
  const [quickFilterWait, setQuickFilterWait] = useState(false);
  const [providers, setProviders] = useState<any[]>(FALLBACK_PROVIDERS);
  const [loading, setLoading] = useState(true);

  // 3-Tap Quick Join Modal State
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any>(null);
  const [selectedQueueId, setSelectedQueueId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinSuccessToken, setJoinSuccessToken] = useState<any>(null);
  const [joinError, setJoinError] = useState('');

  const apiUrl = getApiUrl();

  // Load real explore data from backend, fallback to curated list if empty or local
  useEffect(() => {
    let isMounted = true;
    async function fetchExplore() {
      try {
        setLoading(true);
        const url = new URL(`${apiUrl}/api/v1/business/explore`);
        if (selectedCategory !== 'ALL') url.searchParams.set('category', selectedCategory);
        if (searchQuery.trim()) url.searchParams.set('search', searchQuery.trim());
        if (selectedLocation !== 'All Bangalore Areas') url.searchParams.set('location', selectedLocation);

        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            if (Array.isArray(data) && data.length > 0) {
              setProviders(data);
            } else {
              setProviders(FALLBACK_PROVIDERS);
            }
          }
        }
      } catch (err) {
        if (isMounted) setProviders(FALLBACK_PROVIDERS);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    const timer = setTimeout(fetchExplore, 200);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [selectedCategory, searchQuery, selectedLocation, apiUrl]);

  // Client-side filtering when using fallback or for instant responsive feel
  const filteredProviders = useMemo(() => {
    return providers.filter((p) => {
      if (selectedCategory !== 'ALL' && p.type !== selectedCategory) return false;
      if (selectedLocation !== 'All Bangalore Areas') {
        const locWord = selectedLocation.toLowerCase().split(' ')[0];
        if (!p.address?.toLowerCase().includes(locWord)) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = p.name?.toLowerCase().includes(q);
        const matchesAddr = p.address?.toLowerCase().includes(q);
        const matchesQueue = p.queues?.some((queue: any) =>
          queue.name?.toLowerCase().includes(q) ||
          queue.doctorName?.toLowerCase().includes(q) ||
          queue.department?.toLowerCase().includes(q) ||
          queue.serviceName?.toLowerCase().includes(q)
        );
        if (!matchesName && !matchesAddr && !matchesQueue) return false;
      }
      if (quickFilterWait && p.estimatedWaitMin > 15) return false;
      return true;
    });
  }, [providers, selectedCategory, selectedLocation, searchQuery, quickFilterWait]);

  // Open 3-tap join modal
  const handleOpenJoin = (provider: any) => {
    setSelectedProvider(provider);
    const firstQueue = provider.queues?.find((q: any) => q.isOpen && !q.isPaused) || provider.queues?.[0];
    setSelectedQueueId(firstQueue?.id || '');
    setJoinError('');
    setJoinSuccessToken(null);
    setJoinModalOpen(true);
  };

  // Submit quick join
  const handleConfirmJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      setJoinError('Please enter your full name and phone number');
      return;
    }
    setJoining(true);
    setJoinError('');
    try {
      const res = await fetch(`${apiUrl}/api/v1/queue/public/${selectedProvider.slug}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          partySize: 1,
          queueId: selectedQueueId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Could not join queue. Please try again.');
      }
      // Save token locally
      localStorage.setItem(`qfast_token_${selectedProvider.slug}`, data.id);
      setJoinSuccessToken(data);
    } catch (err: any) {
      setJoinError(err.message || 'Failed to join queue');
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900 pb-20 sm:pb-12">
      {/* ── Top Discovery Header ── */}
      <header className="sticky top-0 z-30 border-b border-neutral-200/80 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <BrandMark href="/" label="Qfast home" />
              <span className="hidden rounded-md bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 sm:inline-block">
                Find a queue
              </span>
            </div>

            {/* Location Picker */}
            <div className="relative hidden md:flex items-center ml-4 pl-4 border-l border-neutral-200 text-xs font-bold text-neutral-700">
              <MapPin className="w-3.5 h-3.5 text-orange-500 mr-1.5 flex-shrink-0" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent border-none text-neutral-900 font-bold focus:ring-0 cursor-pointer pr-4"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/for-business"
              className="text-xs font-bold text-neutral-600 hover:text-orange-600 bg-neutral-100 hover:bg-orange-50 px-3.5 py-2 rounded-xl transition"
            >
              For business
            </Link>
            <Link
              href="/auth/login"
              className="rounded-xl bg-neutral-900 hover:bg-black text-white text-xs font-bold px-4 py-2 transition"
            >
              Log in
            </Link>
          </div>
        </div>

        {/* Search & Location Bar */}
        <div className="mx-auto max-w-7xl px-4 pb-3 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-600" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search doctors, clinics, salons, diagnostic labs, restaurants..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl border border-neutral-200 bg-neutral-50 hover:bg-white focus:bg-white text-sm font-medium text-neutral-900 placeholder:text-neutral-600 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Mobile Location Selector */}
            <div className="md:hidden flex items-center bg-neutral-100 rounded-xl px-3 py-2 text-xs font-bold text-neutral-700">
              <MapPin className="w-3.5 h-3.5 text-orange-500 mr-1.5 flex-shrink-0" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="bg-transparent border-none text-neutral-900 font-bold focus:ring-0 w-full"
              >
                {LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* ── Category Chips ── */}
      <section className="bg-white border-b border-neutral-200/60 sticky top-[109px] z-20 shadow-xs">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all shadow-xs ${
                    isSelected
                      ? 'bg-neutral-900 text-white shadow-neutral-900/20'
                      : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200/80 hover:text-neutral-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-orange-400' : 'text-neutral-500'}`} />
                  <span>{cat.label}</span>
                </button>
              );
            })}

            <div className="h-5 w-px bg-neutral-200 mx-1 flex-shrink-0" />

            {/* Quick Filter: Short Wait */}
            <button
              onClick={() => setQuickFilterWait(!quickFilterWait)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-bold whitespace-nowrap transition shadow-xs ${
                quickFilterWait
                  ? 'bg-emerald-600 text-white'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Under 15 min wait</span>
            </button>
          </div>
        </div>
      </section>

      {/* ── Main Content / Provider Grid ── */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-black text-neutral-900 tracking-tight">
              {selectedCategory === 'ALL'
                ? 'Nearby Services & Live Queues'
                : CATEGORIES.find((c) => c.id === selectedCategory)?.label}
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Showing {filteredProviders.length} active service providers in {selectedLocation}
            </p>
          </div>

          <span className="hidden sm:inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Queue Sync Active
          </span>
        </div>

        {/* Providers Grid */}
        {filteredProviders.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-neutral-300 bg-white p-12 text-center my-8">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center mx-auto mb-3">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-neutral-900">No matching providers found</h3>
            <p className="text-xs text-neutral-500 mt-1 max-w-sm mx-auto">
              Try adjusting your search terms, removing filters, or choosing a different area.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
                setSelectedLocation('All Bangalore Areas');
                setQuickFilterWait(false);
              }}
              className="mt-4 px-4 py-2 bg-neutral-900 text-white rounded-xl text-xs font-bold hover:bg-black transition"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProviders.map((provider) => {
              const isFood = provider.type === 'RESTAURANT' || provider.type === 'CAFE';
              const waitMins = provider.estimatedWaitMin || 0;
              const waitingCount = provider.totalWaiting || 0;

              // Color-coded live wait badge
              let waitBadgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
              let waitDotColor = 'bg-emerald-500';
              if (waitMins > 30) {
                waitBadgeColor = 'bg-rose-50 text-rose-800 border-rose-200';
                waitDotColor = 'bg-rose-500';
              } else if (waitMins > 15) {
                waitBadgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
                waitDotColor = 'bg-amber-500';
              }

              return (
                <div
                  key={provider.id}
                  className="group relative flex flex-col justify-between rounded-3xl border border-neutral-200/80 bg-white p-5 shadow-xs hover:border-orange-300 hover:shadow-lg transition-all duration-200"
                >
                  <div>
                    {/* Top Badges */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700">
                        {provider.type.replace('_', ' ')}
                      </span>

                      {/* Live Wait Badge */}
                      <span className={`inline-flex items-center gap-1.5 text-xs font-extrabold px-3 py-1 rounded-full border ${waitBadgeColor}`}>
                        <span className={`w-2 h-2 rounded-full ${waitDotColor} animate-pulse`} />
                        <span>~{waitMins} min wait</span>
                        <span className="text-neutral-400">•</span>
                        <span>{waitingCount} waiting</span>
                      </span>
                    </div>

                    {/* Provider Name & Address */}
                    <h3 className="text-base font-black text-neutral-950 group-hover:text-orange-600 transition">
                      {provider.name}
                    </h3>
                    <p className="text-xs text-neutral-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-neutral-400 flex-shrink-0" />
                      <span className="truncate">{provider.address}</span>
                    </p>

                    {/* Rating & Details */}
                    <div className="flex items-center gap-2 mt-2 text-xs">
                      <span className="inline-flex items-center gap-1 font-bold text-neutral-900 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                        <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                        <span>{provider.rating || 4.8}</span>
                      </span>
                      <span className="text-neutral-400">({provider.reviewCount || 45} reviews)</span>
                    </div>

                    {/* Queues / Doctors / Services pills */}
                    {provider.queues && provider.queues.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-neutral-100">
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                          {provider.type === 'CLINIC' || provider.type === 'HOSPITAL'
                            ? 'Available Doctors / OPDs'
                            : 'Available Counters & Desks'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {provider.queues.map((q: any) => (
                            <span
                              key={q.id}
                              className="inline-flex items-center text-[11px] font-medium bg-neutral-50 text-neutral-700 px-2.5 py-1 rounded-lg border border-neutral-200/60"
                            >
                              {q.doctorName ? `${q.doctorName} (${q.name})` : q.serviceName || q.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-5 pt-3 border-t border-neutral-100 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenJoin(provider)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs py-2.5 transition shadow-md shadow-orange-500/20 active:scale-98"
                    >
                      <Ticket className="w-3.5 h-3.5" />
                      <span>Join Queue</span>
                    </button>

                    <Link
                      href={isFood ? `/r/${provider.slug}/join` : `/c/${provider.slug}`}
                      className="inline-flex items-center justify-center rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-bold text-xs px-3 py-2.5 transition"
                      aria-label="View Details"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── 3-Tap Quick Join Modal ── */}
      {joinModalOpen && selectedProvider && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl border border-neutral-200 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3 mb-4">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 bg-orange-50 px-2.5 py-0.5 rounded-full">
                  Quick 3-Tap Join
                </span>
                <h2 className="text-base font-black text-neutral-900 mt-1">
                  {selectedProvider.name}
                </h2>
              </div>
              <button
                onClick={() => setJoinModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-100 hover:bg-neutral-200 text-neutral-600 flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {joinSuccessToken ? (
              /* Success View */
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-neutral-950">You’re in the Queue!</h3>
                  <p className="text-xs text-neutral-500 mt-1">
                    Your token has been confirmed. Relax while we track your turn live.
                  </p>
                </div>

                <div className="rounded-2xl border-2 border-orange-400 bg-orange-50/60 p-4 text-center">
                  <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider">Your Token Number</p>
                  <p className="text-4xl font-black text-orange-600 mt-1">#{joinSuccessToken.tokenNumber}</p>
                  <div className="mt-3 flex items-center justify-center gap-4 text-xs font-semibold text-neutral-700">
                    <span>Position: {joinSuccessToken.position} in line</span>
                    <span>•</span>
                    <span>Est. Wait: ~{joinSuccessToken.estimatedWaitMin} mins</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col gap-2">
                  <Link
                    href={`/r/${selectedProvider.slug}/join`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-900 text-white font-bold text-xs py-3 hover:bg-black transition"
                  >
                    <span>View Live Progress Tracker</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setJoinModalOpen(false)}
                    className="w-full text-xs font-bold text-neutral-500 hover:text-neutral-700 py-2"
                  >
                    Close & Keep Exploring
                  </button>
                </div>
              </div>
            ) : (
              /* Join Form */
              <form onSubmit={handleConfirmJoin} className="space-y-4">
                {joinError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-800">
                    {joinError}
                  </div>
                )}

                {/* Queue / Doctor Selection (if multiple) */}
                {selectedProvider.queues && selectedProvider.queues.length > 1 && (
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 mb-1.5">
                      Select Doctor or Service Queue
                    </label>
                    <div className="space-y-2">
                      {selectedProvider.queues.map((q: any) => (
                        <label
                          key={q.id}
                          className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition ${
                            selectedQueueId === q.id
                              ? 'border-orange-500 bg-orange-50/50'
                              : 'border-neutral-200 hover:bg-neutral-50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="queueSelect"
                              checked={selectedQueueId === q.id}
                              onChange={() => setSelectedQueueId(q.id)}
                              className="text-orange-600 focus:ring-orange-500"
                            />
                            <div>
                              <p className="text-xs font-bold text-neutral-900">
                                {q.doctorName || q.name}
                              </p>
                              {q.department && (
                                <p className="text-[11px] text-neutral-500">{q.department}</p>
                              )}
                            </div>
                          </div>
                          <span className="text-[11px] font-bold text-neutral-500">
                            {q.waitingCount || 0} waiting
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Customer Details */}
                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Your Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-700 mb-1">
                    Mobile Number (for SMS & Turn Alerts)
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-neutral-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>
                  <p className="text-[10px] text-neutral-400 mt-1">
                    We will notify you when you are 2nd in line so you can arrive on time.
                  </p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={joining}
                  className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-black text-xs py-3.5 transition shadow-lg shadow-orange-500/20 active:scale-98 disabled:opacity-60"
                >
                  {joining ? 'Assigning Your Token...' : 'Confirm & Get Token (Tap 3)'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile Fixed Bottom Navigation ── */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-neutral-200/90 py-2 px-6 flex items-center justify-around shadow-lg">
        <Link href="/" className="flex flex-col items-center gap-0.5 text-orange-600 font-bold text-[10px]">
          <Search className="w-5 h-5" />
          <span>Explore</span>
        </Link>
        <Link href="/for-business" className="flex flex-col items-center gap-0.5 text-neutral-500 hover:text-neutral-900 font-semibold text-[10px]">
          <Building2 className="w-5 h-5" />
          <span>Business</span>
        </Link>
        <Link href="/auth/login" className="flex flex-col items-center gap-0.5 text-neutral-500 hover:text-neutral-900 font-semibold text-[10px]">
          <Users className="w-5 h-5" />
          <span>Staff</span>
        </Link>
      </nav>
    </div>
  );
}
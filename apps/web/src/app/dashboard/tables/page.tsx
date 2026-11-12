'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Armchair,
  Plus,
  Printer,
  Download,
  Edit2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { downloadQrCode, generateQrDataUrl } from '@/lib/qr';
import { getBusinessPublicPath } from '@/lib/business-links';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';

export default function TablesManagementPage() {
  const [business, setBusiness] = useState<any>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTable, setEditingTable] = useState<any | null>(null);
  const [tableForm, setTableForm] = useState({ name: '', capacity: 4 });
  const [submitting, setSubmitting] = useState(false);
  const [tableToDelete, setTableToDelete] = useState<any | null>(null);
  const [floorFilter, setFloorFilter] = useState<'ALL' | 'FREE' | 'BUSY'>('ALL');
  const [tableQuery, setTableQuery] = useState('');
  const [printQR, setPrintQR] = useState<{
    title: string;
    url: string;
    instruction: string;
    image: string;
    kind: 'entrance' | 'table';
  } | null>(null);
  const router = useRouter();
  const toast = useToast();
  const apiUrl = getApiUrl();

  const fetchData = async (quiet = false) => {
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

        const tablesRes = await fetch(`${apiUrl}/api/v1/tables/${curBiz.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (tablesRes.ok) {
          const tablesData = await tablesRes.json();
          setTables(tablesData || []);
        }
      }
    } catch (err) {
      console.error(err);
      if (!quiet) toast.error('Network Error', 'Failed to load restaurant floor tables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const timer = window.setInterval(() => {
      void fetchData(true);
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!printQR) return;

    const printFrame = window.requestAnimationFrame(() => window.print());
    const previousAfterPrint = window.onafterprint;
    window.onafterprint = () => {
      setPrintQR(null);
      window.onafterprint = previousAfterPrint;
    };

    return () => {
      window.cancelAnimationFrame(printFrame);
      window.onafterprint = previousAfterPrint;
    };
  }, [printQR]);

  const prepareQrAction = async (
    title: string,
    url: string,
    instruction: string,
    kind: 'entrance' | 'table',
  ) => {
    try {
      const image = await generateQrDataUrl(url);
      setPrintQR({ title, url, instruction, image, kind });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      toast.error('QR Generation Failed', 'Could not render printable QR sticker.');
    }
  };

  const handleDownloadQr = async (url: string, filename: string, quiet = false) => {
    try {
      await downloadQrCode(url, filename);
      if (!quiet) toast.success('Downloaded', `Saved ${filename} to your downloads.`);
    } catch (err) {
      console.error('Failed to download QR code:', err);
      toast.error('Download Failed', 'Could not download this QR code.');
    }
  };

  const tableOrderUrl = (name: string) =>
    `${typeof window !== 'undefined' ? window.location.origin : ''}/r/${business?.slug}/table/${encodeURIComponent(name)}`;

  const qrFileName = (name: string) =>
    `${business?.slug || 'restaurant'}-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-qr.png`;

  const handleSaveTable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!business || !tableForm.name.trim()) return;
    setSubmitting(true);
    const token = localStorage.getItem('accessToken');

    try {
      if (editingTable) {
        // Edit existing table
        const res = await fetch(`${apiUrl}/api/v1/tables/${editingTable.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: tableForm.name.trim(),
            capacity: Number(tableForm.capacity),
          }),
        });
        if (!res.ok) throw new Error('Failed to update table');
        toast.success('Table Updated', `Changes to "${tableForm.name}" saved.`);
      } else {
        // Create new table
        const res = await fetch(`${apiUrl}/api/v1/tables/${business.id}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: tableForm.name.trim(),
            capacity: Number(tableForm.capacity),
          }),
        });
        if (!res.ok) throw new Error('Failed to create table');
        toast.success('Table Added', `"${tableForm.name}" added with auto-generated ordering QR.`);
      }

      setTableForm({ name: '', capacity: 4 });
      setEditingTable(null);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      toast.error('Action Failed', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTable = async () => {
    if (!tableToDelete) return;
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${apiUrl}/api/v1/tables/${tableToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Table Removed', `"${tableToDelete.name}" was deactivated.`);
        setTableToDelete(null);
        fetchData();
      } else {
        throw new Error('Failed to delete table');
      }
    } catch (err: any) {
      toast.error('Delete Failed', 'Cannot deactivate a table with active orders.');
    }
  };

  const openAddModal = () => {
    setEditingTable(null);
    setTableForm({ name: `Table ${tables.length + 1}`, capacity: 4 });
    setShowModal(true);
  };

  const openEditModal = (table: any) => {
    setEditingTable(table);
    setTableForm({ name: table.name, capacity: table.capacity || 4 });
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
          <p className="text-sm text-neutral-500">Loading tables…</p>
        </div>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const entranceUrl = `${origin}${getBusinessPublicPath(business?.slug, business?.type)}`;

  const totalSeats = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);
  const occupiedTables = tables.filter(
    (t) => (t.orders && t.orders.length > 0) || (t.queueTokens && t.queueTokens.length > 0),
  );
  const tableIsOccupied = (table: any) =>
    (table.orders && table.orders.length > 0) || (table.queueTokens && table.queueTokens.length > 0);
  const freeSeats = tables.reduce((sum, table) => sum + (tableIsOccupied(table) ? 0 : table.capacity || 0), 0);
  const visibleTables = tables.filter((table) => {
    const occupied = tableIsOccupied(table);
    if (floorFilter === 'FREE' && occupied) return false;
    if (floorFilter === 'BUSY' && !occupied) return false;
    if (tableQuery.trim() && !table.name.toLowerCase().includes(tableQuery.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <>
      <div className="mx-auto w-full max-w-6xl space-y-6 qr-manager-screen">
        <header>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1 className="ui-title">Tables</h1>
              <p className="ui-copy">Floor, occupancy, and the QR codes guests scan.</p>
              <span className="mt-3 inline-flex rounded-full border border-brand-200 bg-brand-50 px-2.5 py-0.5 text-xs font-semibold text-brand-800">
                {tables.length} tables · {totalSeats} seats
              </span>
            </div>
            <button
              onClick={openAddModal}
              className="ui-btn-primary"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Add table</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">Tables</p>
              <p className="mt-1 text-2xl font-black text-gray-950">{tables.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Available</p>
              <p className="mt-1 text-2xl font-black text-emerald-800">{Math.max(tables.length - occupiedTables.length, 0)}</p>
              <p className="text-xs font-semibold text-emerald-700">{freeSeats} seats open</p>
            </div>
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-red-700">Occupied</p>
              <p className="mt-1 text-2xl font-black text-red-800">{occupiedTables.length}</p>
              <p className="text-xs font-semibold text-red-700">{totalSeats - freeSeats} seats in use</p>
            </div>
          </div>

          <div className="space-y-4 rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">Floor</h3>
                <p className="text-xs text-gray-500">Green is free. Red is occupied. This updates while the restaurant is open.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {([
                  ['ALL', 'All'],
                  ['FREE', 'Available'],
                  ['BUSY', 'Occupied'],
                ] as const).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFloorFilter(value)}
                    className={`min-h-11 rounded-xl px-3 text-xs font-bold ${floorFilter === value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <input
              value={tableQuery}
              onChange={(event) => setTableQuery(event.target.value)}
              placeholder="Find a table"
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
            />

            {tables.length === 0 ? (
              <EmptyState
                icon={Armchair}
                title="No tables yet"
                description="Add the tables you can seat. Each one gets an ordering QR you can download below."
                actionLabel="Add Table 1"
                onAction={openAddModal}
              />
            ) : visibleTables.length === 0 ? (
              <p className="py-6 text-sm text-gray-500">No tables match this view.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {visibleTables.map((table) => {
                  const heldParty = table.queueTokens?.[0];
                  const isOccupied = tableIsOccupied(table);
                  return (
                    <div
                      key={table.id}
                      className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 ${
                        isOccupied ? 'border-red-300 bg-red-50' : 'border-emerald-300 bg-emerald-50'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-lg font-black text-gray-950">{table.name}</p>
                            <p className={`text-xs font-bold ${isOccupied ? 'text-red-700' : 'text-emerald-700'}`}>
                              {isOccupied ? 'Occupied' : 'Available'}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button type="button" onClick={() => openEditModal(table)} className="rounded-lg p-2 text-gray-500 hover:bg-white" aria-label="Edit table">
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button type="button" onClick={() => setTableToDelete(table)} className="rounded-lg p-2 text-gray-500 hover:bg-white hover:text-red-600" aria-label="Remove table">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600">
                          <Users className="h-3.5 w-3.5" />
                          Seats {table.capacity}
                        </p>
                        {isOccupied && (
                          <p className="mt-2 text-xs font-bold text-red-950">
                            {heldParty
                              ? `#${heldParty.tokenNumber} ${heldParty.customerName} · ${heldParty.partySize || 1} guests`
                              : `${table.orders?.length || 1} open bill${(table.orders?.length || 1) === 1 ? '' : 's'} · ₹${Number(table.orders?.[0]?.totalAmount || 0).toFixed(0)}`}
                          </p>
                        )}
                        {isOccupied && table.orders?.[0]?.status && (
                          <p className="mt-1 text-xs font-semibold text-red-800">
                            Kitchen {{
                              PENDING: 'waiting',
                              ACCEPTED: 'accepted',
                              PREPARING: 'cooking',
                              READY: 'ready to serve',
                            }[table.orders[0].status as string] || String(table.orders[0].status).toLowerCase()}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-3xl border border-gray-200/80 bg-white p-5 shadow-xs sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-black text-gray-900">QR codes</h3>
                <p className="text-xs text-gray-500">Download or print a code. The image stays off this screen until you print it.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  void (async () => {
                    await handleDownloadQr(entranceUrl, `${business?.slug || 'restaurant'}-entrance-qr.png`, true);
                    for (const table of tables) {
                      await new Promise((resolve) => window.setTimeout(resolve, 350));
                      await handleDownloadQr(tableOrderUrl(table.name), qrFileName(table.name), true);
                    }
                    toast.success('QR codes saved', 'The door code and every table code were downloaded.');
                  })();
                }}
                className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl bg-gray-900 px-3 text-xs font-bold text-white"
              >
                <Download className="h-3.5 w-3.5" />
                Download all
              </button>
            </div>
            <div className="divide-y divide-gray-100">
              <div className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-bold text-gray-950">Door</p>
                  <p className="text-xs text-gray-500">Guests join the queue from this code.</p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" onClick={() => void prepareQrAction('Door', entranceUrl, 'Scan to join the queue', 'entrance')} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-800">
                    <Printer className="h-3.5 w-3.5" />
                    Print
                  </button>
                  <button type="button" onClick={() => void handleDownloadQr(entranceUrl, `${business?.slug || 'restaurant'}-entrance-qr.png`)} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-orange-50 px-3 text-xs font-bold text-orange-900">
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </button>
                </div>
              </div>
              {tables.map((table) => (
                <div key={table.id} className="flex items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-bold text-gray-950">{table.name}</p>
                    <p className="text-xs text-gray-500">{table.capacity} seats · scan to order, pay, and review</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => void prepareQrAction(table.name, tableOrderUrl(table.name), 'Scan to order, pay, and review', 'table')} className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-gray-200 px-3 text-xs font-bold text-gray-800">
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </button>
                    <button type="button" onClick={() => void handleDownloadQr(tableOrderUrl(table.name), qrFileName(table.name))} className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-orange-50 px-3 text-xs font-bold text-orange-900">
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        {/* Add / Edit Table Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-extrabold text-base text-gray-900">
                  {editingTable ? 'Edit Table' : 'Add Floor Table'}
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleSaveTable} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Table Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    value={tableForm.name}
                    onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })}
                    placeholder="e.g. Table 4, Booth A, Patio 2"
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                    Guest Seating Capacity *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={tableForm.capacity}
                    onChange={(e) => setTableForm({ ...tableForm, capacity: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden transition-all"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-98"
                  >
                    {editingTable ? 'Save Table' : 'Add table'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Branded Confirm Modal for Deactivating Table */}
        <ConfirmModal
          isOpen={!!tableToDelete}
          onClose={() => setTableToDelete(null)}
          onConfirm={handleDeleteTable}
          title="Deactivate Dining Table?"
          description={
            tableToDelete
              ? `Are you sure you want to deactivate "${tableToDelete.name}"? It will no longer appear on your active floor plan.`
              : 'Are you sure you want to delete this table?'
          }
          confirmLabel="Yes, Deactivate Table"
          cancelLabel="Keep Table"
          variant="danger"
        />
      </div>

      {/* Printable Sheet */}
      {printQR && (
        <section className="qr-print-sheet" aria-label="Printable QR code">
          <div className="qr-print-card">
            <div className="qr-sticker-top">
              <span className="qr-print-logos">
                <img className="qr-print-logo" src="/qfast-logo.png" alt="Qfast" />
                {business?.logoUrl && <img className="qr-print-venue" src={business.logoUrl} alt="" />}
              </span>
              <span className="qr-sticker-type">
                {printQR.kind === 'entrance' ? 'WELCOME' : 'SCAN & ORDER'}
              </span>
            </div>
            <h1>{business?.name}</h1>
            <h2>{printQR.title}</h2>
            <img
              className="qr-print-image"
              src={printQR.image}
              alt={`QR code for ${business?.name} ${printQR.title}`}
            />
            <p className="qr-print-instruction">{printQR.instruction}</p>
            <span className="qr-sticker-hint">Point your camera at the code</span>
            <p className="qr-print-url">{printQR.url}</p>
          </div>
        </section>
      )}
    </>
  );
}


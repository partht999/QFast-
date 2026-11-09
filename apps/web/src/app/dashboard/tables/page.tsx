'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Armchair,
  Plus,
  QrCode,
  Printer,
  Download,
  ExternalLink,
  Edit2,
  Trash2,
  Users,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowLeft,
  Sparkles,
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
  const [selectedTableForQR, setSelectedTableForQR] = useState<any>(null);
  const [printQR, setPrintQR] = useState<{
    title: string;
    url: string;
    instruction: string;
    image: string;
    kind: 'entrance' | 'table';
  } | null>(null);
  const [qrError, setQrError] = useState('');

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
      toast.error('Network Error', 'Failed to load restaurant floor tables.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
      setQrError('');
      const image = await generateQrDataUrl(url);
      setPrintQR({ title, url, instruction, image, kind });
    } catch (err) {
      console.error('Failed to generate QR code:', err);
      toast.error('QR Generation Failed', 'Could not render printable QR sticker.');
    }
  };

  const handleDownloadQr = async (url: string, filename: string) => {
    try {
      setQrError('');
      await downloadQrCode(url, filename);
      toast.success('Downloaded', `Saved ${filename} to your downloads.`);
    } catch (err) {
      console.error('Failed to download QR code:', err);
      toast.error('Download Failed', 'Could not download high-res QR code.');
    }
  };

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Loading tables &amp; floor plan...</p>
        </div>
      </div>
    );
  }

  const origin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const entranceUrl = `${origin}${getBusinessPublicPath(business?.slug, business?.type)}?source=walkin`;

  const totalSeats = tables.reduce((acc, t) => acc + (t.capacity || 0), 0);
  const occupiedTables = tables.filter(
    (t) => (t.orders && t.orders.length > 0) || (t.queueTokens && t.queueTokens.length > 0),
  );

  return (
    <>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans qr-manager-screen">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200/80 px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-900 text-xs font-bold transition-colors bg-gray-100 px-3 py-1.5 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Dashboard</span>
            </Link>
            <span className="text-gray-300">/</span>
            <div className="flex items-center gap-2">
              <Armchair className="w-5 h-5 text-orange-600" />
              <h1 className="text-base font-extrabold text-gray-900">Tables &amp; QR Standees</h1>
              <span className="text-xs bg-orange-50 text-orange-700 font-bold px-2.5 py-0.5 rounded-full border border-orange-200">
                {tables.length} tables · {totalSeats} seats
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={openAddModal}
              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-98"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Table</span>
            </button>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
          {/* Entrance QR Standee Hero */}
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-amber-500 rounded-3xl p-6 text-white shadow-md flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider bg-white/20 px-3 py-1 rounded-full text-white backdrop-blur-xs">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Front Entrance Standee</span>
              </span>
              <h2 className="text-2xl font-black tracking-tight">Main Door &amp; Reception QR</h2>
              <p className="text-xs text-orange-100 max-w-lg leading-relaxed">
                This is the only guest QR. People scan it to join the line or order takeaway. Tables below are seats you assign when you call a party.
              </p>
              <div className="pt-2 flex flex-wrap gap-2 text-xs">
                <a
                  href={entranceUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="bg-white text-gray-900 hover:bg-orange-50 font-bold px-4 py-2 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-orange-600" />
                  <span>Test Guest Scan Flow</span>
                </a>
              </div>
            </div>

            <div className="flex flex-col items-center gap-3 bg-white rounded-2xl p-4 text-center shrink-0 text-gray-900 shadow-xl border border-white/20">
              <EntranceQrPreview url={entranceUrl} alt={`Entrance QR for ${business?.name}`} />
              <div className="text-center">
                <span className="text-xs font-black block text-gray-900">{business?.name || 'Restaurant'}</span>
                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Entrance Waitlist</span>
              </div>
              <div className="grid grid-cols-2 gap-2 w-full pt-1">
                <button
                  type="button"
                  onClick={() =>
                    void prepareQrAction(
                      'Entrance Queue Standee',
                      entranceUrl,
                      'Scan to join our live waitlist',
                      'entrance'
                    )
                  }
                  className="bg-gray-900 hover:bg-black text-white text-[11px] font-bold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    void handleDownloadQr(
                      entranceUrl,
                      `${business?.slug || 'restaurant'}-entrance-qr.png`
                    )
                  }
                  className="bg-orange-100 hover:bg-orange-200 text-orange-900 text-[11px] font-bold py-2 px-3 rounded-xl transition-colors flex items-center justify-center gap-1"
                >
                  <Download className="w-3 h-3" />
                  <span>PNG</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {[
              ['Tables', tables.length],
              ['Busy', occupiedTables.length],
              ['Free', Math.max(tables.length - occupiedTables.length, 0)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-gray-200 bg-white px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500">{label}</p>
                <p className="mt-1 text-2xl font-black text-gray-950">{value}</p>
              </div>
            ))}
          </div>

          {/* Floor Plan Tables Grid */}
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-black text-gray-900 flex items-center gap-2">
                  <span>Dining Floor Tables ({tables.length})</span>
                  {occupiedTables.length > 0 && (
                    <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-full">
                      {occupiedTables.length} occupied
                    </span>
                  )}
                </h3>
                <p className="text-xs text-gray-500">
                  Free tables are offered automatically when you call the next party. A busy table stays with that party until the bill is closed.
                </p>
              </div>

              <button
                onClick={openAddModal}
                className="self-start sm:self-auto bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-gray-600" />
                <span>Add Floor Table</span>
              </button>
            </div>

            {tables.length === 0 ? (
              <EmptyState
                icon={Armchair}
                title="No dining tables added yet"
                description="Add the tables you can seat. When you call a party, the next free table is assigned to them."
                actionLabel="Add Table 1"
                onAction={openAddModal}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {tables.map((table) => {
                  const heldParty = table.queueTokens?.[0];
                  const isOccupied = (table.orders && table.orders.length > 0) || Boolean(heldParty);

                  return (
                    <div
                      key={table.id}
                      className={`rounded-2xl p-4 sm:p-5 border transition-all flex flex-col justify-between space-y-3 ${
                        isOccupied
                          ? 'border-amber-300 bg-amber-50/40 shadow-xs'
                          : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xl font-black text-gray-950">{table.name}</span>
                          <span
                            className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                              isOccupied
                                ? 'bg-amber-100 text-amber-900 border-amber-200'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {isOccupied ? 'Busy' : 'Free'}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">
                          <Users className="w-3.5 h-3.5 text-gray-400" />
                          <span>Seats up to <strong className="text-gray-800">{table.capacity} guests</strong></span>
                        </div>

                        {isOccupied && (
                          <div className="bg-white rounded-xl p-2.5 border border-amber-200 text-xs space-y-1 shadow-2xs">
                            <span className="text-[10px] uppercase font-bold text-amber-700 block">
                              {heldParty ? `Party #${heldParty.tokenNumber}` : 'Open order'}
                            </span>
                            <p className="font-extrabold text-gray-900">
                              {heldParty?.customerName || `₹${Number(table.orders[0]?.totalAmount || 0).toFixed(0)}`}
                            </p>
                          </div>
                        )}
                      </div>

                      <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openEditModal(table)}
                            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Table"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setTableToDelete(table)}
                            className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Deactivate Table"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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

        {/* View QR Code Standee Modal */}
        {selectedTableForQR && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="font-extrabold text-base text-gray-900">
                  {selectedTableForQR.name} QR Standee
                </h3>
                <button
                  onClick={() => setSelectedTableForQR(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* QR Image preview */}
              <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col items-center justify-center">
                <TableQrPreview url={selectedTableForQR.url} />
                <span className="text-xs font-black text-gray-800 mt-3">{business?.name}</span>
                <span className="text-xs text-orange-600 font-extrabold">{selectedTableForQR.name}</span>
              </div>

              <div className="space-y-2 pt-1">
                <a
                  href={selectedTableForQR.url}
                  target="_blank"
                  rel="noreferrer"
                  className="block w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-sm"
                >
                  Test Table Order Page 📱
                </a>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      void prepareQrAction(
                        selectedTableForQR.name,
                        selectedTableForQR.url,
                        'Scan to view menu & order from your table',
                        'table'
                      )
                    }
                    className="w-full bg-gray-900 hover:bg-black text-white font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print Standee</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void handleDownloadQr(
                        selectedTableForQR.url,
                        `${business?.slug || 'restaurant'}-${selectedTableForQR.name
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, '-')}-qr.png`
                      )
                    }
                    className="w-full bg-orange-50 hover:bg-orange-100 text-orange-800 border border-orange-200 font-bold text-xs py-2.5 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PNG</span>
                  </button>
                </div>
              </div>
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
              <span className="qr-print-brand">QFAST</span>
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

function EntranceQrPreview({ url, alt }: { url: string; alt: string }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    generateQrDataUrl(url)
      .then((result) => {
        if (!cancelled) setDataUrl(result);
      })
      .catch((err) => console.error('Failed to generate entrance QR preview:', err));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return dataUrl ? (
    <img src={dataUrl} alt={alt} className="w-40 h-40 rounded-xl" />
  ) : (
    <div className="w-40 h-40 rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-500">
      Generating QR…
    </div>
  );
}

function TableQrPreview({ url }: { url: string }) {
  const [dataUrl, setDataUrl] = useState('');

  useEffect(() => {
    let cancelled = false;
    generateQrDataUrl(url)
      .then((result) => {
        if (!cancelled) setDataUrl(result);
      })
      .catch((err) => console.error('Failed to generate table QR preview:', err));
    return () => {
      cancelled = true;
    };
  }, [url]);

  return dataUrl ? (
    <img src={dataUrl} alt="Table QR" className="w-44 h-44 rounded-xl shadow-xs" />
  ) : (
    <div className="w-44 h-44 rounded-xl bg-gray-100 flex items-center justify-center text-xs text-gray-500">
      Generating QR…
    </div>
  );
}

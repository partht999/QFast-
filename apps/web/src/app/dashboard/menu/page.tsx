'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  UtensilsCrossed,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { getApiUrl } from '@/lib/api';
import { useToast } from '@/components/ui/toast';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { EmptyState } from '@/components/ui/empty-state';

export default function MenuManagementPage() {
  const [business, setBusiness] = useState<any>(null);
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [itemForm, setItemForm] = useState({
    name: '',
    price: 250,
    isVeg: true,
    prepTimeMinutes: 15,
    description: '',
    servedAs: '',
    imageUrl: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<any | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<any | null>(null);
  const [stockChange, setStockChange] = useState<{ id: string; name: string; isAvailable: boolean } | null>(null);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState('');
  const [dietaryFilter, setDietaryFilter] = useState<'ALL' | 'VEG' | 'NON_VEG'>('ALL');
  const [stockFilter, setStockFilter] = useState<'ALL' | 'IN_STOCK' | 'SOLD_OUT'>('ALL');

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

        const menuRes = await fetch(`${apiUrl}/api/v1/menu/${curBiz.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (menuRes.ok) {
          const menuData = await menuRes.json();
          setMenu(menuData);
        }
      }
    } catch (err) {
      console.error(err);
      toast.error('Network Error', 'Failed to load menu data. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim() || !business) return;
    setSubmitting(true);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await fetch(`${apiUrl}/api/v1/menu/${business.id}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      if (!res.ok) throw new Error('Failed to create category');
      setCategoryName('');
      setShowCategoryModal(false);
      toast.success('Category Added', `Created category "${categoryName.trim()}".`);
      fetchData();
    } catch (err: any) {
      toast.error('Could Not Add Category', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim() || !selectedCategoryId) return;
    setSubmitting(true);
    const token = localStorage.getItem('accessToken');

    try {
      if (editingItem) {
        // Update existing item
        const res = await fetch(`${apiUrl}/api/v1/menu/items/${editingItem.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: itemForm.name.trim(),
            price: Number(itemForm.price),
            isVeg: itemForm.isVeg,
            prepTimeMinutes: Number(itemForm.prepTimeMinutes),
            description: itemForm.description.trim() || undefined,
            servedAs: itemForm.servedAs.trim() || undefined,
            imageUrl: itemForm.imageUrl.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error('Failed to update dish');
        toast.success('Dish Updated', `Changes to "${itemForm.name}" saved successfully.`);
      } else {
        // Create new item
        const res = await fetch(`${apiUrl}/api/v1/menu/items`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            categoryId: selectedCategoryId,
            name: itemForm.name.trim(),
            price: Number(itemForm.price),
            isVeg: itemForm.isVeg,
            prepTimeMinutes: Number(itemForm.prepTimeMinutes),
            description: itemForm.description.trim() || undefined,
            servedAs: itemForm.servedAs.trim() || undefined,
            imageUrl: itemForm.imageUrl.trim() || undefined,
          }),
        });
        if (!res.ok) throw new Error('Failed to create dish');
        toast.success('Dish Added', `"${itemForm.name}" is now on your menu.`);
      }

      setItemForm({ name: '', price: 250, isVeg: true, prepTimeMinutes: 15, description: '', servedAs: '', imageUrl: '' });
      setEditingItem(null);
      setShowItemModal(false);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to Save Dish', err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleItemAvailability = async (itemId: string, itemName: string, currentStatus: boolean) => {
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${apiUrl}/api/v1/menu/items/${itemId}/toggle-availability`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.info(
          currentStatus ? 'Marked Sold Out (86\'d)' : 'Marked In Stock',
          `"${itemName}" is now ${currentStatus ? 'unavailable for guests' : 'available for ordering'}.`
        );
        fetchData();
      }
    } catch (err) {
      toast.error('Error', 'Could not toggle item availability.');
    }
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${apiUrl}/api/v1/menu/items/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Dish Removed', `"${itemToDelete.name}" was deleted from your menu.`);
        setItemToDelete(null);
        fetchData();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (err) {
      toast.error('Delete Failed', 'Could not delete item. Please try again.');
    }
  };

  const handleDeleteCategory = async () => {
    if (!categoryToDelete) return;
    const token = localStorage.getItem('accessToken');
    try {
      const res = await fetch(`${apiUrl}/api/v1/menu/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success('Category Deleted', `"${categoryToDelete.name}" removed successfully.`);
        setCategoryToDelete(null);
        fetchData();
      } else {
        throw new Error('Failed to delete category');
      }
    } catch (err) {
      toast.error('Delete Failed', 'Cannot delete category containing dishes. Delete or move items first.');
    }
  };

  const openAddItemModal = (catId?: string) => {
    setEditingItem(null);
    setItemForm({ name: '', price: 250, isVeg: true, prepTimeMinutes: 15, description: '', servedAs: '', imageUrl: '' });
    if (catId) {
      setSelectedCategoryId(catId);
    } else if (menu?.categories?.length > 0) {
      setSelectedCategoryId(menu.categories[0].id);
    }
    setShowItemModal(true);
  };

  const openEditItemModal = (item: any, catId: string) => {
    setEditingItem(item);
    setSelectedCategoryId(catId);
    setItemForm({
      name: item.name,
      price: Number(item.price),
      isVeg: item.isVeg,
      prepTimeMinutes: item.prepTimeMinutes || 15,
      description: item.description || '',
      servedAs: item.servedAs || '',
      imageUrl: item.imageUrl || '',
    });
    setShowItemModal(true);
  };

  const categories = menu?.categories || [];

  // Filtered Categories & Items
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat: any) => {
        const filteredItems = (cat.items || []).filter((item: any) => {
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesName = item.name.toLowerCase().includes(q);
            const matchesDesc = item.description?.toLowerCase().includes(q);
            if (!matchesName && !matchesDesc) return false;
          }
          if (dietaryFilter === 'VEG' && !item.isVeg) return false;
          if (dietaryFilter === 'NON_VEG' && item.isVeg) return false;
          if (stockFilter === 'IN_STOCK' && !item.isAvailable) return false;
          if (stockFilter === 'SOLD_OUT' && item.isAvailable) return false;
          return true;
        });
        return { ...cat, items: filteredItems };
      })
      .filter((cat: any) => {
        // If searching/filtering, keep category only if it has matching items
        if (searchQuery || dietaryFilter !== 'ALL' || stockFilter !== 'ALL') {
          return cat.items.length > 0;
        }
        return true;
      });
  }, [categories, searchQuery, dietaryFilter, stockFilter]);

  const totalItemsCount = categories.reduce((sum: number, c: any) => sum + (c.items?.length || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Loading digital menu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      {/* Top Navigation */}
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
            <UtensilsCrossed className="w-5 h-5 text-orange-600" />
            <h1 className="text-base font-extrabold text-gray-900">Menu Catalog</h1>
            <span className="text-xs bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-200">
              {totalItemsCount} dishes
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Category</span>
          </button>
          <button
            onClick={() => {
              if (categories.length === 0) {
                toast.warning('No Categories', 'Please create at least one category before adding dishes.');
                setShowCategoryModal(true);
                return;
              }
              openAddItemModal();
            }}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1.5 active:scale-98"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Dish</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Search & Filter Bar */}
        {categories.length > 0 && (
          <div className="bg-white rounded-2xl p-4 border border-gray-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search dish name, description, ingredients..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Dietary Filter */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                {(['ALL', 'VEG', 'NON_VEG'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setDietaryFilter(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      dietaryFilter === mode
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {mode === 'ALL' ? 'All Diets' : mode === 'VEG' ? '🟢 Veg' : '🔴 Non-Veg'}
                  </button>
                ))}
              </div>

              {/* Stock Status Filter */}
              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                {(['ALL', 'IN_STOCK', 'SOLD_OUT'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setStockFilter(mode)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                      stockFilter === mode
                        ? 'bg-white text-gray-900 shadow-xs'
                        : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {mode === 'ALL' ? 'All Stock' : mode === 'IN_STOCK' ? '✓ In Stock' : '✕ Sold Out'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Empty State when no categories exist */}
        {categories.length === 0 ? (
          <EmptyState
            icon={UtensilsCrossed}
            title="Build your digital QR menu"
            description="Organize your dishes into categories (e.g. Starters, Main Course, Drinks, Desserts). Diners scan table or queue QRs to order straight from their phone."
            actionLabel="Create First Category"
            onAction={() => setShowCategoryModal(true)}
          />
        ) : filteredCategories.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-200/80 shadow-xs">
            <Search className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 text-sm mb-1">No matching dishes found</h3>
            <p className="text-xs text-gray-500 mb-4">
              Try adjusting your search query or reset your dietary and stock filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setDietaryFilter('ALL');
                setStockFilter('ALL');
              }}
              className="text-xs font-bold text-orange-600 hover:underline"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredCategories.map((cat: any) => (
              <section
                key={cat.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-200/80 shadow-xs space-y-4"
              >
                {/* Category Header */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3 flex-wrap gap-2">
                  <div className="flex items-center gap-2.5">
                    <Layers className="w-4 h-4 text-orange-600" />
                    <h3 className="text-base font-black text-gray-900">{cat.name}</h3>
                    <span className="text-xs bg-gray-100 text-gray-600 font-bold px-2.5 py-0.5 rounded-full">
                      {cat.items?.length || 0}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openAddItemModal(cat.id)}
                      className="text-xs font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-colors flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to {cat.name}</span>
                    </button>
                    {(!cat.items || cat.items.length === 0) && (
                      <button
                        onClick={() => setCategoryToDelete(cat)}
                        className="text-gray-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Delete empty category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Items Grid */}
                {cat.items?.length === 0 ? (
                  <p className="text-xs text-gray-400 py-4 italic">
                    No items in this category. Click '+ Add to {cat.name}' to start adding dishes.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {cat.items.map((item: any) => (
                      <div
                        key={item.id}
                        className={`rounded-2xl p-4 border transition-all flex items-start justify-between gap-3 ${
                          item.isAvailable
                            ? 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
                            : 'bg-gray-50/80 border-gray-200/60 opacity-75'
                        }`}
                      >
                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                item.isVeg ? 'bg-emerald-500' : 'bg-rose-500'
                              }`}
                              title={item.isVeg ? 'Vegetarian' : 'Non-Vegetarian'}
                            />
                            <h4 className="truncate text-base font-bold text-gray-950">{item.name}</h4>
                          </div>

                          <span className="block text-base font-extrabold text-gray-950">
                            ₹{Number(item.price).toFixed(2)}
                          </span>

                          {item.description && (
                            <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed">
                              {item.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 pt-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-400">
                              <Clock className="w-3 h-3" />
                              <span>~{item.prepTimeMinutes || 15}m prep</span>
                            </span>
                          </div>
                        </div>

                        {/* Controls */}
                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <button
                            onClick={() => setStockChange({ id: item.id, name: item.name, isAvailable: item.isAvailable })}
                            className={`text-[11px] font-bold px-3 py-1 rounded-full transition-colors border ${
                              item.isAvailable
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            }`}
                            title="Toggle in-stock / sold-out"
                          >
                            {item.isAvailable ? '✓ In Stock' : '✕ Sold Out'}
                          </button>

                          <div className="flex items-center gap-1 pt-1">
                            <button
                              onClick={() => openEditItemModal(item, cat.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                              title="Edit dish"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setItemToDelete(item)}
                              className="p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete dish"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </main>

      {/* Add Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-gray-900">Add Category</h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Starters, Main Course, Drinks"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden transition-all"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCategoryModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-98"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Dish Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="font-extrabold text-base text-gray-900">
                {editingItem ? 'Edit Dish' : 'Add New Dish'}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-3.5">
              {!editingItem && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Category *
                  </label>
                  <select
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
                  >
                    {categories.map((c: any) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Dish Name *
                </label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Paneer Butter Masala"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                    Prep Time (min)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={itemForm.prepTimeMinutes}
                    onChange={(e) => setItemForm({ ...itemForm, prepTimeMinutes: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Dietary Classification
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, isVeg: true })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      itemForm.isVeg
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-gray-200 text-gray-600 bg-white'
                    }`}
                  >
                    <span>🟢</span>
                    <span>Vegetarian</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setItemForm({ ...itemForm, isVeg: false })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                      !itemForm.isVeg
                        ? 'border-rose-500 bg-rose-50 text-rose-800'
                        : 'border-gray-200 text-gray-600 bg-white'
                    }`}
                  >
                    <span>🔴</span>
                    <span>Non-Vegetarian</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                  Description / Ingredients (Optional)
                </label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="What is in it, and anything a guest should know"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">How it’s served</label>
                <input
                  value={itemForm.servedAs}
                  onChange={(e) => setItemForm({ ...itemForm, servedAs: e.target.value })}
                  placeholder="In a copper bowl with mint chutney"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Photo URL</label>
                <input
                  value={itemForm.imageUrl}
                  onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.target.value })}
                  placeholder="https://"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-500 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all shadow-sm active:scale-98"
                >
                  {editingItem ? 'Save Changes' : 'Add Dish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Branded Confirm Modal for Deleting Menu Item */}
      <ConfirmModal
        isOpen={!!itemToDelete}
        onClose={() => setItemToDelete(null)}
        onConfirm={handleDeleteItem}
        title="Delete Menu Dish?"
        description={
          itemToDelete
            ? `Are you sure you want to remove "${itemToDelete.name}" from your menu? Diners won't be able to view or order it.`
            : 'Are you sure you want to delete this dish?'
        }
        confirmLabel="Yes, Delete Dish"
        cancelLabel="Keep on Menu"
        variant="danger"
      />

      {/* Branded Confirm Modal for Deleting Category */}
      <ConfirmModal
        isOpen={!!categoryToDelete}
        onClose={() => setCategoryToDelete(null)}
        onConfirm={handleDeleteCategory}
        title="Delete Menu Category?"
        description={
          categoryToDelete
            ? `Are you sure you want to delete the "${categoryToDelete.name}" category?`
            : 'Are you sure you want to delete this category?'
        }
        confirmLabel="Yes, Delete Category"
        cancelLabel="Keep Category"
        variant="danger"
      />

      <ConfirmModal
        isOpen={!!stockChange}
        onClose={() => setStockChange(null)}
        onConfirm={() => {
          const change = stockChange;
          setStockChange(null);
          if (change) void handleToggleItemAvailability(change.id, change.name, change.isAvailable);
        }}
        title={stockChange?.isAvailable ? `Mark ${stockChange.name} sold out?` : `Put ${stockChange?.name || 'this dish'} back on the menu?`}
        description={
          stockChange?.isAvailable
            ? 'Guests will not be able to order it until you turn it back on.'
            : 'Guests can order it again.'
        }
        confirmLabel={stockChange?.isAvailable ? 'Mark sold out' : 'Put it back'}
        cancelLabel="Go back"
        variant={stockChange?.isAvailable ? 'warning' : 'primary'}
      />
    </div>
  );
}

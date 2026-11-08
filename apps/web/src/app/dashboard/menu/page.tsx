'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { getApiUrl } from '@/lib/api';

export default function MenuManagementPage() {
  const [business, setBusiness] = useState<any>(null);
  const [menu, setMenu] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [categoryName, setCategoryName] = useState('');
  const [itemForm, setItemForm] = useState({
    name: '',
    price: 250,
    isVeg: true,
    prepTimeMinutes: 15,
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();

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
      await fetch(`${apiUrl}/api/v1/menu/${business.id}/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      setCategoryName('');
      setShowCategoryModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.name.trim() || !selectedCategoryId) return;
    setSubmitting(true);
    const token = localStorage.getItem('accessToken');

    try {
      await fetch(`${apiUrl}/api/v1/menu/items`, {
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
        }),
      });

      setItemForm({ name: '', price: 250, isVeg: true, prepTimeMinutes: 15, description: '' });
      setShowItemModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleItemAvailability = async (itemId: string) => {
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`${apiUrl}/api/v1/menu/items/${itemId}/toggle-availability`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    const token = localStorage.getItem('accessToken');
    try {
      await fetch(`${apiUrl}/api/v1/menu/items/${itemId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  const categories = menu?.categories || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xl font-black text-brand-600">
            ⚡ Qfast
          </Link>
          <span className="text-gray-300">/</span>
          <h1 className="text-sm font-bold text-gray-800">Digital Menu Manager</h1>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
          >
            ← Overview
          </Link>
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs px-3.5 py-2 rounded-xl transition-colors"
          >
            + Add Category
          </button>
          <button
            onClick={() => {
              if (categories.length === 0) {
                alert('Please create a category first!');
                return;
              }
              setSelectedCategoryId(categories[0].id);
              setShowItemModal(true);
            }}
            className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
          >
            + Add Menu Item
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-6 space-y-6">
        {categories.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-orange-100 shadow-sm max-w-lg mx-auto mt-8">
            <span className="text-5xl block mb-4">📖</span>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Build your digital menu</h3>
            <p className="text-xs text-gray-500 mb-6 leading-relaxed">
              Organize your dishes into categories (e.g. Starters, Main Course, Drinks) so diners can easily browse and order from their table.
            </p>
            <button
              onClick={() => setShowCategoryModal(true)}
              className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md"
            >
              + Create First Category
            </button>
          </div>
        ) : (
          categories.map((cat: any) => (
            <div key={cat.id} className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-black text-gray-900">{cat.name}</h3>
                  <span className="text-xs bg-gray-100 text-gray-600 font-semibold px-2 py-0.5 rounded-full">
                    {cat.items?.length || 0} items
                  </span>
                </div>

                <button
                  onClick={() => {
                    setSelectedCategoryId(cat.id);
                    setShowItemModal(true);
                  }}
                  className="text-xs font-bold text-brand-600 hover:text-brand-700 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-xl transition-colors"
                >
                  + Add to {cat.name}
                </button>
              </div>

              {cat.items?.length === 0 ? (
                <p className="text-xs text-gray-400 py-3 italic">
                  No items in this category yet. Click '+ Add to {cat.name}' to add a dish.
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cat.items?.map((item: any) => (
                    <div
                      key={item.id}
                      className="border border-gray-100 rounded-2xl p-4 flex items-start justify-between gap-3 hover:border-gray-200 transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] ${item.isVeg ? 'text-green-600' : 'text-red-600'}`}>
                            ●
                          </span>
                          <h4 className="font-bold text-sm text-gray-900">{item.name}</h4>
                        </div>
                        <span className="font-extrabold text-sm text-gray-900 mt-1 block">
                          ₹{Number(item.price).toFixed(2)}
                        </span>
                        {item.description && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{item.description}</p>
                        )}
                        <span className="text-[10px] text-gray-400 mt-1 block">
                          ⏱️ ~{item.prepTimeMinutes || 15}m prep
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <button
                          onClick={() => handleToggleItemAvailability(item.id)}
                          className={`text-[11px] font-bold px-2.5 py-1 rounded-full transition-colors ${
                            item.isAvailable
                              ? 'bg-green-100 text-green-800 hover:bg-red-50 hover:text-red-600'
                              : 'bg-red-100 text-red-800 hover:bg-green-50 hover:text-green-600'
                          }`}
                        >
                          {item.isAvailable ? '✓ In Stock' : '✕ Sold Out'}
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-gray-400 hover:text-red-600 text-xs transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </main>

      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-extrabold text-base text-gray-900 mb-3">Add Menu Category</h3>
            <form onSubmit={handleCreateCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category Name</label>
                <input
                  type="text"
                  required
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Starters, Main Course, Drinks"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-brand-400 focus:outline-none"
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
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Item Modal */}
      {showItemModal && (
        <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-extrabold text-base text-gray-900 mb-3">Add Menu Item</h3>
            <form onSubmit={handleCreateItem} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Category</label>
                <select
                  value={selectedCategoryId}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-400 focus:outline-none"
                >
                  {categories.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  placeholder="e.g. Paneer Butter Masala"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Price (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={itemForm.price}
                    onChange={(e) => setItemForm({ ...itemForm, price: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Prep Time (min)</label>
                  <input
                    type="number"
                    min="1"
                    value={itemForm.prepTimeMinutes}
                    onChange={(e) => setItemForm({ ...itemForm, prepTimeMinutes: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-2 focus:ring-brand-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Dietary Type</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="isVeg"
                      checked={itemForm.isVeg}
                      onChange={() => setItemForm({ ...itemForm, isVeg: true })}
                      className="accent-green-600"
                    />
                    <span>🟢 Veg</span>
                  </label>
                  <label className="flex items-center gap-1.5 text-xs cursor-pointer">
                    <input
                      type="radio"
                      name="isVeg"
                      checked={!itemForm.isVeg}
                      onChange={() => setItemForm({ ...itemForm, isVeg: false })}
                      className="accent-red-600"
                    />
                    <span>🔴 Non-Veg</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
                  placeholder="Ingredients or taste notes..."
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs focus:ring-2 focus:ring-brand-400 focus:outline-none"
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
                  className="bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                >
                  Save Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

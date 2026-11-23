'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import {
  UtensilsCrossed,
  BookOpen,
  Plus,
  ExternalLink,
  ArrowUpDown,
  Search,
  SlidersHorizontal,
  Pencil,
  Copy,
  Trash2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  GripVertical,
  LayoutGrid,
  Check,
  X,
  AlertTriangle,
  RefreshCw,
  Utensils,
  Eye,
  CheckCircle2,
  Upload,
  Clock,
  Percent,
  Layers,
  ArrowRight,
} from 'lucide-react';
import type { MenuCategory, MenuItem } from '@/lib/types';

export default function MenuBuilderPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'unavailable'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Selected items checkbox
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  // Modals
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [isEditItemModalOpen, setIsEditItemModalOpen] = useState(false);
  const [isAddCatModalOpen, setIsAddCatModalOpen] = useState(false);
  const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);

  // Form states for Add/Edit item (matching exact mobile/desktop UI from screenshots)
  const [formItemId, setFormItemId] = useState('');
  const [formMenuOutlet, setFormMenuOutlet] = useState<'e0000000-0000-0000-0000-000000000001' | 'e0000000-0000-0000-0000-000000000002'>('e0000000-0000-0000-0000-000000000001');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('');
  const [formDiscountPercent, setFormDiscountPercent] = useState('');
  const [formPrepTime, setFormPrepTime] = useState('15');
  const [formCategoryId, setFormCategoryId] = useState('');
  const [formDietary, setFormDietary] = useState<string[]>(['Vegetarian']);
  const [formImageUrl, setFormImageUrl] = useState('');
  const [formIsAvailable, setFormIsAvailable] = useState(true);
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Portion-wise extras & Portions
  const [formPortionWiseExtras, setFormPortionWiseExtras] = useState(false);
  const [formPortions, setFormPortions] = useState<Array<{ id: string; name: string; price: string }>>([]);

  // Extras
  const [formSingleChoiceExtras, setFormSingleChoiceExtras] = useState(false);
  const [formExtras, setFormExtras] = useState<Array<{ id: string; name: string; price: string }>>([]);

  // Stock Settings
  const [formTrackQuantity, setFormTrackQuantity] = useState(false);
  const [formStockQuantity, setFormStockQuantity] = useState('');

  // Dropdown & Inline Category Creation
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isInlineCreateCategory, setIsInlineCreateCategory] = useState(false);
  const [inlineNewCategoryName, setInlineNewCategoryName] = useState('');
  const [inlineNewCategorySaving, setInlineNewCategorySaving] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Image Upload state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Form state for Add Category
  const [newCatName, setNewCatName] = useState('');
  const [newCatOutlet, setNewCatOutlet] = useState<'e0000000-0000-0000-0000-000000000001' | 'e0000000-0000-0000-0000-000000000002'>('e0000000-0000-0000-0000-000000000001');

  // Category menu dropdown state
  const [openCatMenuId, setOpenCatMenuId] = useState<string | null>(null);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadMenu = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/menu');
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
      }
    } catch {
      showToast('error', 'Failed to load menu items');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMenu();
  }, []);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
        setIsInlineCreateCategory(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  // Flatten all items across all categories
  const allItems = useMemo(() => {
    const list: Array<MenuItem & { categoryName: string }> = [];
    categories.forEach((cat) => {
      (cat.items || []).forEach((item) => {
        list.push({ ...item, categoryName: cat.name });
      });
    });
    return list;
  }, [categories]);

  // Dynamic Metrics
  const totalCategoriesCount = categories.length;
  const totalItemsCount = allItems.length;
  const availableCount = allItems.filter((i) => i.is_available).length;
  const unavailableCount = allItems.filter((i) => !i.is_available).length;

  // Filtered Items
  const filteredItems = useMemo(() => {
    return allItems.filter((item) => {
      // Category filter
      if (selectedCategoryId !== 'all' && item.category_id !== selectedCategoryId) {
        return false;
      }
      // Status filter
      if (statusFilter === 'available' && !item.is_available) return false;
      if (statusFilter === 'unavailable' && item.is_available) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesCat = item.categoryName.toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      return true;
    });
  }, [allItems, selectedCategoryId, statusFilter, searchQuery]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredItems.slice(start, start + itemsPerPage);
  }, [filteredItems, currentPage]);

  const handleToggleAvailability = async (item: MenuItem) => {
    const newStatus = !item.is_available;
    // Optimistic UI update
    setCategories((prev) =>
      prev.map((c) => ({
        ...c,
        items: c.items?.map((i) => (i.id === item.id ? { ...i, is_available: newStatus } : i)),
      }))
    );

    try {
      const res = await fetch(`/api/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toggleAvailability: true }),
      });
      if (res.ok) {
        showToast('success', `${item.name} is now ${newStatus ? 'Available' : 'Unavailable'}`);
      } else {
        throw new Error();
      }
    } catch {
      showToast('error', 'Failed to update item availability');
      loadMenu();
    }
  };

  const handleImageFileChange = async (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('error', 'Please select an image file (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      showToast('error', 'Image size should be less than 10MB.');
      return;
    }

    // Instant local preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormImageUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload to server
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.success && data.url) {
        setFormImageUrl(data.url);
        showToast('success', 'Image uploaded successfully!');
      }
    } catch {
      // Keep data URL as working preview
      console.warn('Upload error, kept data URL preview');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleOpenAddItemModal = () => {
    setFormItemId('');
    setFormName('');
    setFormDesc('');
    setFormPrice('');
    setFormDiscountPercent('');
    setFormPrepTime('15');
    setFormMenuOutlet('e0000000-0000-0000-0000-000000000001');
    setFormCategoryId(selectedCategoryId !== 'all' ? selectedCategoryId : categories[0]?.id || '');
    setFormDietary(['Vegetarian']);
    setFormImageUrl('');
    setFormIsAvailable(true);
    setFormPortionWiseExtras(false);
    setFormPortions([]);
    setFormSingleChoiceExtras(false);
    setFormExtras([]);
    setFormTrackQuantity(false);
    setFormStockQuantity('');
    setIsCategoryDropdownOpen(false);
    setIsInlineCreateCategory(false);
    setIsAddItemModalOpen(true);
  };

  const handleOpenEditItemModal = (item: MenuItem) => {
    setFormItemId(item.id);
    setFormName(item.name);
    setFormDesc(item.description || '');
    setFormPrice((item.price_minor / 100).toString());
    setFormDiscountPercent(item.discount_percent ? item.discount_percent.toString() : '');
    setFormPrepTime(item.prep_time_minutes ? item.prep_time_minutes.toString() : '15');
    setFormCategoryId(item.category_id);
    setFormMenuOutlet(
      item.outlet_id === 'e0000000-0000-0000-0000-000000000002' || item.category_id?.includes('cafe')
        ? 'e0000000-0000-0000-0000-000000000002'
        : 'e0000000-0000-0000-0000-000000000001'
    );
    setFormDietary(item.dietary_labels || ['Vegetarian']);
    setFormImageUrl(item.image_url || '');
    setFormIsAvailable(item.is_available);
    setFormPortionWiseExtras(Boolean(item.portion_wise_extras));
    setFormPortions(
      (item.portions || []).map((p, idx) => ({
        id: `p-${idx}-${Date.now()}`,
        name: p.name,
        price: (p.price_minor / 100).toString(),
      }))
    );
    setFormSingleChoiceExtras(Boolean(item.single_choice_extras));
    setFormExtras(
      (item.extras || []).map((e, idx) => ({
        id: `e-${idx}-${Date.now()}`,
        name: e.name,
        price: (e.price_minor / 100).toString(),
      }))
    );
    setFormTrackQuantity(Boolean(item.track_quantity));
    setFormStockQuantity(item.stock_quantity ? item.stock_quantity.toString() : '');
    setIsCategoryDropdownOpen(false);
    setIsInlineCreateCategory(false);
    setIsEditItemModalOpen(true);
  };

  const handleAddPortion = () => {
    setFormPortions((prev) => [
      ...prev,
      { id: `p-${Date.now()}`, name: '', price: '' },
    ]);
  };

  const handleRemovePortion = (id: string) => {
    setFormPortions((prev) => prev.filter((p) => p.id !== id));
  };

  const handlePortionChange = (id: string, field: 'name' | 'price', val: string) => {
    setFormPortions((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const handleAddExtra = () => {
    setFormExtras((prev) => [
      ...prev,
      { id: `e-${Date.now()}`, name: '', price: '' },
    ]);
  };

  const handleRemoveExtra = (id: string) => {
    setFormExtras((prev) => prev.filter((e) => e.id !== id));
  };

  const handleExtraChange = (id: string, field: 'name' | 'price', val: string) => {
    setFormExtras((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: val } : e))
    );
  };

  const handleCreateInlineCategory = async () => {
    if (!inlineNewCategoryName.trim()) return;
    setInlineNewCategorySaving(true);
    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: inlineNewCategoryName.trim(),
          outlet_id: formMenuOutlet,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const newCat = json.category;
        await loadMenu();
        if (newCat?.id) {
          setFormCategoryId(newCat.id);
        }
        setInlineNewCategoryName('');
        setIsInlineCreateCategory(false);
        setIsCategoryDropdownOpen(false);
        showToast('success', `Category "${inlineNewCategoryName.trim()}" created`);
      } else {
        throw new Error();
      }
    } catch {
      showToast('error', 'Failed to create category');
    } finally {
      setInlineNewCategorySaving(false);
    }
  };

  const handleDuplicateItem = async (item: MenuItem) => {
    try {
      const res = await fetch('/api/menu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: item.category_id,
          name: `${item.name} (Copy)`,
          description: item.description,
          price_minor: item.price_minor,
          dietary_labels: item.dietary_labels,
          image_url: item.image_url,
          discount_percent: item.discount_percent || 0,
          prep_time_minutes: item.prep_time_minutes || 15,
          portions: item.portions || [],
          extras: item.extras || [],
        }),
      });
      if (res.ok) {
        showToast('success', `Duplicated "${item.name}"`);
        loadMenu();
      }
    } catch {
      showToast('error', 'Failed to duplicate item');
    }
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPrice.trim() || !formCategoryId) {
      showToast('error', 'Please fill in all required fields (Item Name, Category, Price).');
      return;
    }

    setFormSubmitting(true);
    const priceMinor = Math.round(parseFloat(formPrice) * 100);
    const discountPct = formDiscountPercent.trim() ? Math.max(0, Math.min(100, parseFloat(formDiscountPercent))) : 0;
    const discountPriceMinor = discountPct > 0 ? Math.round(priceMinor * (1 - discountPct / 100)) : priceMinor;
    const prepMinutes = formPrepTime.trim() ? parseInt(formPrepTime, 10) : 15;
    const finalImageUrl = formImageUrl.trim() || '/images/food/dal-baati.jpg';

    const portionsData = formPortions
      .filter((p) => p.name.trim())
      .map((p) => ({
        name: p.name.trim(),
        price_minor: Math.round(parseFloat(p.price || '0') * 100),
      }));

    const extrasData = formExtras
      .filter((e) => e.name.trim())
      .map((e) => ({
        name: e.name.trim(),
        price_minor: Math.round(parseFloat(e.price || '0') * 100),
      }));

    const payload = {
      name: formName.trim(),
      description: formDesc.trim(),
      price_minor: priceMinor,
      category_id: formCategoryId,
      outlet_id: formMenuOutlet,
      dietary_labels: formDietary,
      image_url: finalImageUrl,
      is_available: formIsAvailable,
      discount_percent: discountPct,
      discount_price_minor: discountPriceMinor,
      prep_time_minutes: prepMinutes,
      portions: portionsData,
      extras: extrasData,
      single_choice_extras: formSingleChoiceExtras,
      portion_wise_extras: formPortionWiseExtras,
      track_quantity: formTrackQuantity,
      stock_quantity: formStockQuantity.trim() ? parseInt(formStockQuantity, 10) : 0,
    };

    try {
      if (formItemId) {
        // Edit item
        const res = await fetch(`/api/menu/${formItemId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast('success', 'Menu item updated successfully');
          setIsEditItemModalOpen(false);
          loadMenu();
        } else {
          throw new Error();
        }
      } else {
        // Add item
        const res = await fetch('/api/menu', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        if (res.ok) {
          showToast('success', 'New menu item added successfully');
          setIsAddItemModalOpen(false);
          loadMenu();
        } else {
          throw new Error();
        }
      }
    } catch {
      showToast('error', 'Failed to save menu item');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', 'Item deleted successfully');
        setItemToDelete(null);
        loadMenu();
      } else {
        throw new Error();
      }
    } catch {
      showToast('error', 'Failed to delete item');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    try {
      const res = await fetch('/api/menu/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCatName.trim(),
          outlet_id: newCatOutlet,
        }),
      });
      if (res.ok) {
        showToast('success', `Category "${newCatName}" created`);
        setNewCatName('');
        setIsAddCatModalOpen(false);
        loadMenu();
      }
    } catch {
      showToast('error', 'Failed to create category');
    }
  };

  const handleDeleteCategory = async (catId: string, catName: string) => {
    if (!confirm(`Are you sure you want to delete category "${catName}" and its items?`)) return;
    try {
      const res = await fetch(`/api/menu/categories?id=${catId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', `Category "${catName}" deleted`);
        if (selectedCategoryId === catId) setSelectedCategoryId('all');
        loadMenu();
      }
    } catch {
      showToast('error', 'Failed to delete category');
    }
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedItemIds(paginatedItems.map((i) => i.id));
    } else {
      setSelectedItemIds([]);
    }
  };

  const handleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const currentCategory = categories.find((c) => c.id === selectedCategoryId);

  return (
    <div className="space-y-4">
      {/* ── Toast Notification ── */}
      {notification && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border transition-all animate-bounce ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-800'
              : 'bg-red-50 border-red-300 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <h1
            className="text-2xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Menu Builder
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Manage your restaurant &amp; café menu items, categories, pricing and availability
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Status Badge */}
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] text-xs font-semibold shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            Menu Published
          </span>

          {/* View Online Menu */}
          <Link
            href="/restaurant"
            target="_blank"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#FBF6EF] text-xs font-semibold shadow-xs transition"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#B78A48]" />
            <span>View Online Menu</span>
          </Link>

          {/* Reorder Categories */}
          <button
            onClick={() => setIsReorderModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#FBF6EF] text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-[#B78A48]" />
            <span>Reorder Categories</span>
          </button>

          {/* + Add Item Button */}
          <button
            onClick={handleOpenAddItemModal}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#680b0c] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
            <span>Add Item</span>
          </button>
        </div>
      </div>

      {/* ── 4 Top Stat Cards matching Screenshot ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Card 1: Total Categories */}
        <div
          onClick={() => setSelectedCategoryId('all')}
          className="bg-white border border-[#E8DCD2] rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-[#B78A48] transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#B78A48] shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#81736D]">Total Categories</p>
              <p className="text-xl font-bold text-[#302421] leading-tight">{totalCategoriesCount}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#81736D] group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Card 2: Total Menu Items */}
        <div
          onClick={() => {
            setSelectedCategoryId('all');
            setStatusFilter('all');
          }}
          className="bg-white border border-[#E8DCD2] rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-[#B78A48] transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#B78A48] shrink-0">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#81736D]">Total Menu Items</p>
              <p className="text-xl font-bold text-[#302421] leading-tight">{totalItemsCount}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#81736D] group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Card 3: Available Items */}
        <div
          onClick={() => setStatusFilter('available')}
          className="bg-white border border-[#E8DCD2] rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-emerald-400 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#81736D]">Available Items</p>
              <p className="text-xl font-bold text-[#302421] leading-tight">{availableCount}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#81736D] group-hover:translate-x-0.5 transition-transform" />
        </div>

        {/* Card 4: Unavailable Items */}
        <div
          onClick={() => setStatusFilter('unavailable')}
          className="bg-white border border-[#E8DCD2] rounded-xl p-3.5 shadow-xs flex items-center justify-between cursor-pointer hover:border-red-400 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#81736D]">Unavailable Items</p>
              <p className="text-xl font-bold text-[#302421] leading-tight">{unavailableCount}</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#81736D] group-hover:translate-x-0.5 transition-transform" />
        </div>
      </div>

      {/* ── Two-Column Main Content (Left: Categories, Right: Items Table) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* ── Left Column: Menu Categories ── */}
        <div className="lg:col-span-4 xl:col-span-3 bg-white border border-[#E8DCD2] rounded-2xl p-3.5 shadow-xs flex flex-col space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-[#E8DCD2]">
            <h2
              className="text-base font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Menu Categories
            </h2>
            <button
              onClick={() => setIsAddCatModalOpen(true)}
              className="px-2.5 py-1 rounded-md bg-[#4F0809] hover:bg-[#680b0c] text-white text-[11px] font-semibold flex items-center gap-1 shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3 h-3 text-[#D8AA67]" />
              <span>Add Category</span>
            </button>
          </div>

          <div className="space-y-1.5 overflow-y-auto max-h-[620px] pr-0.5">
            {/* All Items Option */}
            <div
              onClick={() => setSelectedCategoryId('all')}
              className={`p-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs font-semibold ${
                selectedCategoryId === 'all'
                  ? 'bg-[#FBF6EF] text-[#4F0809] border border-[#B78A48]'
                  : 'hover:bg-[#FBF6EF]/60 text-[#302421] border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#4F0809]/10 text-[#4F0809] flex items-center justify-center">
                  <LayoutGrid className="w-4 h-4" />
                </div>
                <span>All Items</span>
              </div>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[#E8DCD2] text-[#81736D]">
                {totalItemsCount}
              </span>
            </div>

            {/* Individual Categories */}
            {categories.length === 0 && (
              <div className="py-6 px-3 text-center text-[#81736D] text-xs">
                <BookOpen className="w-5 h-5 mx-auto mb-1 text-[#D8AA67] opacity-60" />
                <p className="font-semibold text-[#4F0809]">No Categories Yet</p>
                <p className="text-[11px] text-[#81736D] mt-0.5">Click &quot;+ Add Category&quot; above to create one.</p>
              </div>
            )}
            {categories.map((cat) => {
              const itemCount = (cat.items || []).length;
              const isSelected = selectedCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={`group relative p-2 rounded-xl flex items-center justify-between cursor-pointer transition text-xs ${
                    isSelected
                      ? 'bg-[#FBF6EF] text-[#4F0809] border border-[#B78A48] font-bold'
                      : 'hover:bg-[#FBF6EF]/60 text-[#302421] border border-transparent font-medium'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <GripVertical className="w-3.5 h-3.5 text-[#81736D]/40 group-hover:text-[#81736D] shrink-0" />
                    <img
                      src="/images/food/dal-baati.jpg"
                      alt={cat.name}
                      className="w-8 h-8 rounded-lg object-cover border border-[#E8DCD2] shrink-0"
                    />
                    <span className="truncate">{cat.name}</span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-white border border-[#E8DCD2] text-[#81736D] font-semibold">
                      {itemCount}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenCatMenuId(openCatMenuId === cat.id ? null : cat.id);
                      }}
                      className="p-1 rounded hover:bg-white text-[#81736D] hover:text-[#4F0809]"
                    >
                      <MoreVertical className="w-3.5 h-3.5" />
                    </button>

                    {/* Context Menu for Category */}
                    {openCatMenuId === cat.id && (
                      <div className="absolute right-2 top-10 w-36 bg-white border border-[#E8DCD2] rounded-xl shadow-xl py-1 z-30 text-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenCatMenuId(null);
                            handleDeleteCategory(cat.id, cat.name);
                          }}
                          className="w-full text-left px-3 py-1.5 text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete Category</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Right Column: All Menu Items Table ── */}
        <div className="lg:col-span-8 xl:col-span-9 bg-white border border-[#E8DCD2] rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
          <div>
            {/* Table Header Bar */}
            <div className="p-3.5 border-b border-[#E8DCD2] bg-[#FBF6EF]/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h3
                  className="text-base font-bold text-[#4F0809]"
                  style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                >
                  {currentCategory ? currentCategory.name : 'All Menu Items'}
                </h3>
                <p className="text-[11px] text-[#81736D]">
                  Showing {filteredItems.length} items {selectedCategoryId === 'all' ? 'across all categories' : `in ${currentCategory?.name}`}
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#81736D]" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search menu items..."
                    className="pl-7 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:outline-none focus:border-[#4F0809] w-40 sm:w-48"
                  />
                </div>

                {/* Category Filter */}
                <select
                  value={selectedCategoryId}
                  onChange={(e) => {
                    setSelectedCategoryId(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white text-[#302421] focus:outline-none"
                >
                  <option value="all">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value as any);
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white text-[#302421] focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="available">Available</option>
                  <option value="unavailable">Unavailable</option>
                </select>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedCategoryId('all');
                    setStatusFilter('all');
                  }}
                  title="Reset Filters"
                  className="p-1.5 rounded-lg border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] transition cursor-pointer"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {loading ? (
                <div className="p-12 text-center text-xs text-[#81736D] flex flex-col items-center justify-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-[#4F0809] mb-2" />
                  <span>Loading menu items...</span>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="p-12 text-center text-xs text-[#81736D]">
                  <UtensilsCrossed className="w-8 h-8 text-[#D8AA67] mx-auto mb-2 opacity-60" />
                  <p className="font-semibold text-[#4F0809]">No menu items found</p>
                  <p className="text-[11px] text-[#81736D] mt-0.5">
                    Try adjusting your filters or click &quot;+ Add Item&quot; to create a new dish.
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-[#E8DCD2] bg-[#FBF6EF]/50 text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
                      <th className="py-2.5 px-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedItemIds.length === paginatedItems.length && paginatedItems.length > 0}
                          onChange={handleSelectAll}
                          className="rounded border-[#E8DCD2] accent-[#4F0809]"
                        />
                      </th>
                      <th className="py-2.5 px-3 w-16">Image</th>
                      <th className="py-2.5 px-3">
                        <span className="flex items-center gap-1 cursor-pointer">
                          Item Name <ArrowUpDown className="w-2.5 h-2.5" />
                        </span>
                      </th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">
                        <span className="flex items-center gap-1 cursor-pointer">
                          Price <ArrowUpDown className="w-2.5 h-2.5" />
                        </span>
                      </th>
                      <th className="py-2.5 px-3">Availability</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E8DCD2]/70 text-[#302421]">
                    {paginatedItems.map((item) => (
                      <tr key={item.id} className="hover:bg-[#FBF6EF]/40 transition-colors">
                        <td className="py-2.5 px-3">
                          <input
                            type="checkbox"
                            checked={selectedItemIds.includes(item.id)}
                            onChange={() => handleSelectItem(item.id)}
                            className="rounded border-[#E8DCD2] accent-[#4F0809]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <img
                            src={item.image_url || '/images/food/dal-baati.jpg'}
                            alt={item.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/images/food/dal-baati.jpg';
                            }}
                            className="w-10 h-10 rounded-lg object-cover border border-[#E8DCD2]"
                          />
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-xs text-[#302421]">{item.name}</p>
                            {item.prep_time_minutes ? (
                              <span className="inline-flex items-center gap-0.5 text-[10px] text-[#64748B] bg-[#F1F5F9] px-1.5 py-0.5 rounded font-medium">
                                <Clock className="w-2.5 h-2.5 text-[#D97706]" />
                                {item.prep_time_minutes}m
                              </span>
                            ) : null}
                            {item.discount_percent && item.discount_percent > 0 ? (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                                -{item.discount_percent}%
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[11px] text-[#81736D] truncate max-w-[260px]">
                            {item.description || 'Traditional royal delicacy prepared by royal khansama.'}
                          </p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-md bg-[#FBF6EF] border border-[#E8DCD2] text-[10px] font-semibold text-[#8C6D3B]">
                            {item.categoryName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          {item.discount_percent && item.discount_percent > 0 ? (
                            <div className="flex flex-col">
                              <span className="font-bold text-xs text-[#302421]">
                                ₹{(item.discount_price_minor ? item.discount_price_minor / 100 : (item.price_minor * (1 - item.discount_percent / 100)) / 100).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-[#81736D] line-through">
                                ₹{(item.price_minor / 100).toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-xs text-[#302421]">
                              ₹{(item.price_minor / 100).toFixed(2)}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {/* Live Toggle Switch matching Screenshot */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleToggleAvailability(item)}
                              className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                                item.is_available ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                  item.is_available ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span
                              className={`text-xs font-semibold ${
                                item.is_available ? 'text-[#10B981]' : 'text-[#9CA3AF]'
                              }`}
                            >
                              {item.is_available ? 'Available' : 'Unavailable'}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {/* Edit */}
                            <button
                              onClick={() => handleOpenEditItemModal(item)}
                              title="Edit Item"
                              className="p-1.5 rounded-md hover:bg-[#FBF6EF] text-[#81736D] hover:text-[#4F0809] transition"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>

                            {/* Duplicate */}
                            <button
                              onClick={() => handleDuplicateItem(item)}
                              title="Duplicate Item"
                              className="p-1.5 rounded-md hover:bg-[#FBF6EF] text-[#81736D] hover:text-[#4F0809] transition"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>

                            {/* Delete */}
                            <button
                              onClick={() => setItemToDelete(item)}
                              title="Delete Item"
                              className="p-1.5 rounded-md hover:bg-red-50 text-red-500 hover:text-red-700 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Table Footer / Pagination */}
          <div className="p-3 border-t border-[#E8DCD2] bg-[#FBF6EF]/40 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#81736D] gap-2">
            <div>
              Showing {filteredItems.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
              {Math.min(currentPage * itemsPerPage, filteredItems.length)} of {filteredItems.length} items
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 rounded border border-[#E8DCD2] bg-white text-[#302421] disabled:opacity-40"
                >
                  &lt;
                </button>
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentPage(i + 1)}
                    className={`w-7 h-7 rounded border font-semibold text-xs ${
                      currentPage === i + 1
                        ? 'bg-[#4F0809] border-[#4F0809] text-white'
                        : 'bg-white border-[#E8DCD2] text-[#302421] hover:bg-[#FBF6EF]'
                    }`}
                  >
                    {i + 1}
                  </button>
                ))}
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="px-2 py-1 rounded border border-[#E8DCD2] bg-white text-[#302421] disabled:opacity-40"
                >
                  &gt;
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Modal: Add / Edit Item (Matching reference screenshots) ── */}
      {(isAddItemModalOpen || isEditItemModalOpen) && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#E2E8F0] max-w-md w-full shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4.5 border-b border-[#F1F5F9] shrink-0">
              <h2 className="text-xl font-bold text-[#1E293B] tracking-tight">
                {formItemId ? 'Edit Menu Item' : 'Add Menu Item'}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setIsAddItemModalOpen(false);
                  setIsEditItemModalOpen(false);
                }}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#64748B] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleSaveItem} className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-xs">
              {/* Menu * */}
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Menu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formMenuOutlet}
                    onChange={(e) => setFormMenuOutlet(e.target.value as any)}
                    className="w-full appearance-none px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-medium text-[#1E293B] focus:border-[#4F0809] focus:outline-none pr-9 cursor-pointer shadow-xs"
                  >
                    <option value="e0000000-0000-0000-0000-000000000001">Main Menu (Restaurant)</option>
                    <option value="e0000000-0000-0000-0000-000000000002">The Palace Courtyard Café &amp; Lounge</option>
                  </select>
                  <ChevronDown className="w-4 h-4 text-[#64748B] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              {/* Category * with Dropdown & Inline Create Category */}
              <div className="relative" ref={categoryDropdownRef}>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Category <span className="text-rose-500">*</span>
                </label>
                
                {/* Trigger button */}
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen((prev) => !prev)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs font-medium transition cursor-pointer shadow-xs ${
                    isCategoryDropdownOpen
                      ? 'border-[#2563EB] ring-2 ring-[#2563EB]/20 bg-white'
                      : 'border-[#CBD5E1] bg-white hover:border-[#94A3B8] text-[#1E293B]'
                  }`}
                >
                  <span className={formCategoryId ? 'text-[#1E293B] font-semibold' : 'text-[#94A3B8]'}>
                    {categories.find((c) => c.id === formCategoryId)?.name || 'Select Category'}
                  </span>
                  {isCategoryDropdownOpen ? (
                    <ChevronUp className="w-4 h-4 text-[#2563EB]" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-[#64748B]" />
                  )}
                </button>

                {/* Dropdown Menu matching Screenshot 2 */}
                {isCategoryDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-30 bg-white border border-[#CBD5E1] rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-150">
                    {/* Inline Create Category Form or Link */}
                    {isInlineCreateCategory ? (
                      <div className="p-3 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-2">
                        <p className="text-[11px] font-bold text-[#1E293B]">New Category Name</p>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            autoFocus
                            value={inlineNewCategoryName}
                            onChange={(e) => setInlineNewCategoryName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleCreateInlineCategory();
                              }
                            }}
                            placeholder="e.g. Traditional Breads"
                            className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-[#CBD5E1] bg-white focus:outline-none focus:border-[#2563EB]"
                          />
                          <button
                            type="button"
                            disabled={inlineNewCategorySaving || !inlineNewCategoryName.trim()}
                            onClick={handleCreateInlineCategory}
                            className="px-3 py-1.5 rounded-lg bg-[#2563EB] text-white text-xs font-semibold hover:bg-[#1D4ED8] disabled:opacity-50 transition cursor-pointer"
                          >
                            {inlineNewCategorySaving ? 'Saving...' : 'Add'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsInlineCreateCategory(false)}
                            className="px-2 py-1.5 rounded-lg border border-[#CBD5E1] text-[#64748B] hover:bg-white text-xs cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsInlineCreateCategory(true)}
                        className="w-full text-left px-4 py-2.5 text-xs font-semibold text-[#2563EB] hover:bg-[#EFF6FF] border-b border-[#F1F5F9] flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Plus className="w-4 h-4 text-[#2563EB]" />
                        <span>Create Category</span>
                      </button>
                    )}

                    {/* Category List */}
                    <div className="max-h-48 overflow-y-auto divide-y divide-[#F1F5F9]">
                      {categories.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => {
                            setFormCategoryId(c.id);
                            setIsCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#F8FAFC] transition flex items-center justify-between cursor-pointer ${
                            formCategoryId === c.id ? 'bg-[#F0FDF4] font-bold text-[#15803D]' : 'text-[#334155]'
                          }`}
                        >
                          <span>{c.name}</span>
                          {formCategoryId === c.id && <Check className="w-3.5 h-3.5 text-[#15803D]" />}
                        </button>
                      ))}
                      {categories.length === 0 && (
                        <div className="px-4 py-3 text-center text-[#94A3B8]">
                          No categories yet. Click "+ Create Category" above.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Item Name * */}
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Item Name *"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-medium text-[#1E293B] focus:border-[#4F0809] focus:outline-none shadow-xs"
                />
              </div>

              {/* Item Photo Box */}
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Item Photo
                </label>

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageFileChange(file);
                  }}
                />

                {formImageUrl ? (
                  <div className="relative rounded-2xl overflow-hidden border border-[#CBD5E1] group bg-[#F8FAFC]">
                    <div className="h-44 w-full overflow-hidden flex items-center justify-center bg-gray-50">
                      <img
                        src={formImageUrl}
                        alt="Menu Item Preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.currentTarget as HTMLImageElement).src = '/images/food/dal-baati.jpg';
                        }}
                      />
                    </div>
                    {isUploadingImage && (
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-2xs flex items-center justify-center text-white text-xs font-semibold gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Uploading photo...
                      </div>
                    )}
                    <div className="absolute bottom-2 right-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-xs p-1.5 rounded-xl">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingImage}
                        className="px-2 py-1 rounded-lg bg-white/90 hover:bg-white text-[#1E293B] text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Upload className="w-3 h-3 text-[#2563EB]" />
                        <span>Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormImageUrl('')}
                        className="px-2 py-1 rounded-lg bg-red-600/90 hover:bg-red-600 text-white text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition shadow-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Remove</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) handleImageFileChange(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`h-40 rounded-2xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${
                      dragOver
                        ? 'border-[#2563EB] bg-[#EFF6FF]'
                        : 'border-[#CBD5E1] bg-[#F8FAFC] hover:bg-[#F1F5F9] hover:border-[#94A3B8]'
                    }`}
                  >
                    <div className="flex flex-col items-center gap-1.5 text-[#64748B]">
                      {isUploadingImage ? (
                        <>
                          <RefreshCw className="w-6 h-6 animate-spin text-[#2563EB]" />
                          <span className="text-xs font-semibold text-[#1E293B]">Uploading photo...</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-6 h-6 text-[#64748B]" />
                          <span className="text-xs font-medium text-[#64748B]">Add Photo</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Quick Presets */}
                <div className="mt-2 flex items-center gap-1.5 overflow-x-auto pb-0.5 text-[10px] text-[#64748B]">
                  <span className="shrink-0 font-medium">Quick select:</span>
                  {[
                    { label: 'Dal Baati', url: '/images/food/dal-baati.jpg' },
                    { label: 'Laal Maas', url: '/images/food/laal-maas.jpg' },
                    { label: 'Gatte ki Sabzi', url: '/images/food/gatte-ki-sabzi.jpg' },
                    { label: 'Ker Sangri', url: '/images/food/ker-sangri.jpg' },
                  ].map((preset) => (
                    <button
                      key={preset.url}
                      type="button"
                      onClick={() => setFormImageUrl(preset.url)}
                      className="px-2 py-0.5 rounded-full border border-[#E2E8F0] bg-white hover:bg-[#F8FAFC] text-[#334155] shrink-0 font-medium transition cursor-pointer"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price (₹) * */}
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Price (₹) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-[#64748B]">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(e.target.value)}
                    placeholder="e.g. 350.00"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-bold text-[#1E293B] focus:border-[#4F0809] focus:outline-none shadow-xs"
                  />
                </div>
              </div>

              {/* Discount (%) & Preparation Time (mins) - USER REQUESTED FIELDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0]">
                <div>
                  <label className="block text-[11px] font-semibold text-[#1E293B] mb-1 flex items-center gap-1">
                    <Percent className="w-3 h-3 text-[#2563EB]" />
                    <span>Discount (%)</span>
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={formDiscountPercent}
                    onChange={(e) => setFormDiscountPercent(e.target.value)}
                    placeholder="e.g. 10"
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#1E293B] focus:border-[#2563EB] focus:outline-none"
                  />
                  {formPrice && parseFloat(formDiscountPercent) > 0 && (
                    <p className="text-[10px] text-emerald-700 font-semibold mt-1">
                      Final: ₹{(parseFloat(formPrice) * (1 - Math.min(100, Math.max(0, parseFloat(formDiscountPercent))) / 100)).toFixed(2)} ({formDiscountPercent}% OFF)
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#1E293B] mb-1 flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#D97706]" />
                    <span>Prep Time (mins)</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formPrepTime}
                    onChange={(e) => setFormPrepTime(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full px-3 py-2 rounded-xl border border-[#CBD5E1] bg-white text-xs font-semibold text-[#1E293B] focus:border-[#D97706] focus:outline-none"
                  />
                  <p className="text-[10px] text-[#64748B] mt-1">Kitchen prep estimate</p>
                </div>
              </div>

              {/* Food Dietary Type */}
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Dietary Classification
                </label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { label: 'Vegetarian', color: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
                    { label: 'Non-Vegetarian', color: 'border-rose-500 bg-rose-50 text-rose-700' },
                    { label: 'Contains Egg', color: 'border-amber-500 bg-amber-50 text-amber-700' },
                    { label: 'Vegan', color: 'border-teal-500 bg-teal-50 text-teal-700' },
                  ].map((diet) => {
                    const isSelected = formDietary.includes(diet.label);
                    return (
                      <button
                        key={diet.label}
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setFormDietary(formDietary.filter((d) => d !== diet.label));
                          } else {
                            setFormDietary([...formDietary, diet.label]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition cursor-pointer ${
                          isSelected
                            ? diet.color + ' ring-1'
                            : 'border-[#CBD5E1] bg-white text-[#64748B] hover:bg-[#F8FAFC]'
                        }`}
                      >
                        {diet.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#1E293B] mb-1.5">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Describe ingredients, cooking style, or flavor profile..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#CBD5E1] bg-white text-xs font-normal text-[#1E293B] focus:border-[#4F0809] focus:outline-none shadow-xs"
                />
              </div>

              {/* Portion-wise Extras */}
              <div className="pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#1E293B]">Portion-wise Extras</span>
                  {/* Toggle */}
                  <button
                    type="button"
                    onClick={() => setFormPortionWiseExtras((prev) => !prev)}
                    className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      formPortionWiseExtras ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        formPortionWiseExtras ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">
                  Each portion gets its own add-ons with their own prices (e.g. Extra Cheese: R +₹30, M +₹50).
                </p>
              </div>

              {/* Portions (optional) */}
              <div className="pt-2 space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-[#1E293B]">Portions (optional)</h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    e.g. Half plate ₹100 / Full plate ₹200. Customers must pick one. The first portion's price becomes the item's base price.
                  </p>
                </div>

                {/* Portions list */}
                {formPortions.map((p, idx) => (
                  <div key={p.id} className="flex items-center gap-2 bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
                    <span className="text-[10px] font-bold text-[#64748B] w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      placeholder="Portion name (e.g. Half / Full)"
                      value={p.name}
                      onChange={(e) => handlePortionChange(p.id, 'name', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium focus:outline-none focus:border-[#2563EB]"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">₹</span>
                      <input
                        type="number"
                        placeholder="Price"
                        value={p.price}
                        onChange={(e) => handlePortionChange(p.id, 'price', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-bold focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemovePortion(p.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddPortion}
                  className="w-full py-2 rounded-xl border border-[#CBD5E1] text-[#2563EB] hover:bg-[#EFF6FF] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Portion</span>
                </button>
              </div>

              {/* Extras (optional) */}
              <div className="pt-2 space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-[#1E293B]">Extras (optional)</h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5">
                    Priced add-ons customers can pick, e.g. Extra gravy +₹30, Salad +₹20.
                  </p>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-xs font-medium text-[#1E293B]">Single-choice Extras</span>
                  <button
                    type="button"
                    onClick={() => setFormSingleChoiceExtras((prev) => !prev)}
                    className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      formSingleChoiceExtras ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        formSingleChoiceExtras ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Extras list */}
                {formExtras.map((extraItem, idx) => (
                  <div key={extraItem.id} className="flex items-center gap-2 bg-[#F8FAFC] p-2 rounded-xl border border-[#E2E8F0]">
                    <span className="text-[10px] font-bold text-[#64748B] w-4">{idx + 1}.</span>
                    <input
                      type="text"
                      placeholder="Extra name (e.g. Cheese, Gravy)"
                      value={extraItem.name}
                      onChange={(e) => handleExtraChange(extraItem.id, 'name', e.target.value)}
                      className="flex-1 px-2.5 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium focus:outline-none focus:border-[#2563EB]"
                    />
                    <div className="relative w-28">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-[#64748B]">₹</span>
                      <input
                        type="number"
                        placeholder="Price"
                        value={extraItem.price}
                        onChange={(e) => handleExtraChange(extraItem.id, 'price', e.target.value)}
                        className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-bold focus:outline-none focus:border-[#2563EB]"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveExtra(extraItem.id)}
                      className="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddExtra}
                  className="w-full py-2 rounded-xl border border-[#CBD5E1] text-[#2563EB] hover:bg-[#EFF6FF] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Extra</span>
                </button>
              </div>

              {/* Horizontal line */}
              <div className="border-t border-[#E2E8F0] my-2" />

              {/* Stock Settings */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-[#1E293B]">Stock Settings</h4>
                
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-[#1E293B]">Track Quantity</p>
                    <p className="text-[11px] text-[#64748B]">
                      {formTrackQuantity ? 'Track Qty on' : 'Track Qty off'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormTrackQuantity((prev) => !prev)}
                    className={`w-10 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                      formTrackQuantity ? 'bg-[#2563EB]' : 'bg-[#CBD5E1]'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full bg-white transition-transform ${
                        formTrackQuantity ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {formTrackQuantity && (
                  <div className="bg-[#F8FAFC] p-2.5 rounded-xl border border-[#E2E8F0]">
                    <label className="block text-[11px] font-semibold text-[#1E293B] mb-1">
                      Available Stock Units
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formStockQuantity}
                      onChange={(e) => setFormStockQuantity(e.target.value)}
                      placeholder="e.g. 50"
                      className="w-full px-3 py-1.5 rounded-lg border border-[#CBD5E1] bg-white text-xs font-medium focus:outline-none focus:border-[#2563EB]"
                    />
                  </div>
                )}

                {/* In Stock Checkbox */}
                <label className="flex items-center gap-2 text-xs font-medium text-[#1E293B] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsAvailable}
                    onChange={(e) => setFormIsAvailable(e.target.checked)}
                    className="w-4 h-4 rounded text-[#2563EB] accent-[#2563EB]"
                  />
                  <span>In Stock</span>
                </label>
              </div>

              {/* Horizontal line */}
              <div className="border-t border-[#E2E8F0] my-2" />

              {/* Raw Materials */}
              <div className="space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-[#1E293B]">Raw Materials</h4>
                  <p className="text-[11px] text-[#64748B]">(Recipe/Ingredients)</p>
                </div>
                <p className="text-[11px] text-[#64748B]">
                  Define raw materials needed to prepare this dish
                </p>
                <p className="text-[11px] font-medium text-rose-500">
                  No raw materials found. Add materials in Raw Materials screen first.
                </p>
                <Link
                  href="/dashboard/inventory"
                  className="w-full py-2.5 rounded-xl border border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <ArrowRight className="w-3.5 h-3.5 text-[#334155]" />
                  <span>Go to Raw Materials</span>
                </Link>
              </div>

              {/* Form Bottom Spacing */}
              <div className="h-2" />

              {/* Modal Footer (Sticky or Bottom) */}
              <div className="pt-3 border-t border-[#E2E8F0] flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddItemModalOpen(false);
                    setIsEditItemModalOpen(false);
                  }}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold text-[#64748B] hover:text-[#1E293B] hover:bg-[#F1F5F9] transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-white text-xs font-semibold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {formSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Add Category ── */}
      {isAddCatModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8DCD2] max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DCD2] pb-3">
              <h2
                className="text-lg font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Add Menu Category
              </h2>
              <button
                onClick={() => setIsAddCatModalOpen(false)}
                className="p-1 rounded-full text-[#81736D] hover:text-[#4F0809] hover:bg-[#FBF6EF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Tandoori Breads & Naan"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                  Assign to Palace Outlet
                </label>
                <select
                  value={newCatOutlet}
                  onChange={(e) => setNewCatOutlet(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                >
                  <option value="e0000000-0000-0000-0000-000000000001">
                    Rajmahal Royal Dining (Restaurant)
                  </option>
                  <option value="e0000000-0000-0000-0000-000000000002">
                    The Palace Courtyard Café &amp; Lounge
                  </option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-[#E8DCD2]">
                <button
                  type="button"
                  onClick={() => setIsAddCatModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-xl border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3.5 py-1.5 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-white font-semibold"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Reorder Categories ── */}
      {isReorderModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8DCD2] max-w-sm w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8DCD2] pb-3">
              <h2
                className="text-lg font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                Reorder Menu Categories
              </h2>
              <button
                onClick={() => setIsReorderModalOpen(false)}
                className="p-1 rounded-full text-[#81736D] hover:text-[#4F0809] hover:bg-[#FBF6EF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
              {categories.map((cat, idx) => (
                <div
                  key={cat.id}
                  className="p-2.5 bg-[#FBF6EF] border border-[#E8DCD2] rounded-xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#81736D] w-4">{idx + 1}.</span>
                    <span className="font-semibold text-[#302421]">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      disabled={idx === 0}
                      onClick={() => {
                        const copy = [...categories];
                        const temp = copy[idx - 1];
                        copy[idx - 1] = copy[idx];
                        copy[idx] = temp;
                        setCategories(copy);
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-[#E8DCD2] text-[10px] disabled:opacity-40"
                    >
                      ▲ Up
                    </button>
                    <button
                      disabled={idx === categories.length - 1}
                      onClick={() => {
                        const copy = [...categories];
                        const temp = copy[idx + 1];
                        copy[idx + 1] = copy[idx];
                        copy[idx] = temp;
                        setCategories(copy);
                      }}
                      className="px-2 py-0.5 rounded bg-white border border-[#E8DCD2] text-[10px] disabled:opacity-40"
                    >
                      ▼ Down
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => {
                  setIsReorderModalOpen(false);
                  showToast('success', 'Category display order updated');
                }}
                className="px-4 py-2 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-white font-semibold text-xs"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Delete Confirmation ── */}
      {itemToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8DCD2] max-w-sm w-full p-5 shadow-2xl space-y-3 text-center">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3
              className="text-base font-bold text-[#4F0809]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Delete &quot;{itemToDelete.name}&quot;?
            </h3>
            <p className="text-xs text-[#81736D]">
              This item will be permanently removed from the menu and online ordering channels.
            </p>
            <div className="pt-2 flex gap-2 justify-center text-xs font-semibold">
              <button
                onClick={() => setItemToDelete(null)}
                className="px-4 py-2 rounded-xl border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF]"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteItem(itemToDelete.id)}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

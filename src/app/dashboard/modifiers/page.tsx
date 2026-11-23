'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Sparkles,
  Plus,
  Search,
  SlidersHorizontal,
  Pencil,
  Copy,
  Trash2,
  X,
  GripVertical,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Layers,
  ArrowRight,
  Receipt,
} from 'lucide-react';
import type { ModifierGroup, ModifierOption } from '@/lib/services/modifiers-service';

const PRESET_DOT_COLORS = [
  '#10B981', // green
  '#F59E0B', // amber
  '#F97316', // orange
  '#EF4444', // red
  '#991B1B', // dark red
  '#3B82F6', // blue
  '#8B5CF6', // purple
];

export default function ModifiersPage() {
  const [modifiers, setModifiers] = useState<ModifierGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'add_on' | 'choice' | 'size'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'add_on' | 'choice' | 'size'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formType, setFormType] = useState<'add_on' | 'choice' | 'size'>('choice');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formPrice, setFormPrice] = useState('0');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formOptions, setFormOptions] = useState<ModifierOption[]>([]);
  const [formApplicableItems, setFormApplicableItems] = useState('All Starters & Curries');
  const [submitting, setSubmitting] = useState(false);

  const showToast = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 3500);
  };

  const loadModifiers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/modifiers');
      if (res.ok) {
        const data = await res.json();
        setModifiers(data.modifiers || []);
      }
    } catch {
      showToast('error', 'Failed to load modifiers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadModifiers();
  }, []);

  // Dynamic counts
  const totalCount = modifiers.length;
  const addOnsCount = modifiers.filter((m) => m.type === 'add_on').length;
  const choicesCount = modifiers.filter((m) => m.type === 'choice').length;
  const sizesCount = modifiers.filter((m) => m.type === 'size').length;

  // Filtered list
  const filteredModifiers = useMemo(() => {
    return modifiers.filter((mod) => {
      // Tab filter
      if (activeTab !== 'all' && mod.type !== activeTab) return false;
      // Type dropdown filter
      if (typeFilter !== 'all' && mod.type !== typeFilter) return false;
      // Status dropdown filter
      if (statusFilter === 'active' && !mod.is_active) return false;
      if (statusFilter === 'inactive' && mod.is_active) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = mod.name.toLowerCase().includes(q);
        const matchesDesc = (mod.description || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc) return false;
      }
      return true;
    });
  }, [modifiers, activeTab, typeFilter, statusFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredModifiers.length / itemsPerPage));
  const paginatedList = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredModifiers.slice(start, start + itemsPerPage);
  }, [filteredModifiers, currentPage]);

  const handleToggleStatus = async (mod: ModifierGroup) => {
    const newStatus = !mod.is_active;
    // Optimistic UI update
    setModifiers((prev) =>
      prev.map((m) => (m.id === mod.id ? { ...m, is_active: newStatus } : m))
    );

    try {
      const res = await fetch(`/api/modifiers/${mod.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (res.ok) {
        showToast('success', `${mod.name} is now ${newStatus ? 'Active' : 'Inactive'}`);
      } else {
        throw new Error();
      }
    } catch {
      showToast('error', 'Failed to update status');
      loadModifiers();
    }
  };

  const handleDuplicate = async (mod: ModifierGroup) => {
    try {
      const res = await fetch('/api/modifiers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...mod,
          name: `${mod.name} (Copy)`,
        }),
      });
      if (res.ok) {
        showToast('success', `Duplicated "${mod.name}"`);
        loadModifiers();
      }
    } catch {
      showToast('error', 'Failed to duplicate modifier');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete modifier "${name}"?`)) return;
    try {
      const res = await fetch(`/api/modifiers/${id}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('success', `Deleted "${name}"`);
        loadModifiers();
      }
    } catch {
      showToast('error', 'Failed to delete modifier');
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setFormType('choice');
    setFormName('Spice Level');
    setFormDesc('Choose your preferred spice level for this dish');
    setFormPrice('0');
    setFormIsActive(true);
    setFormApplicableItems('All Starters & Curries');
    setFormOptions([
      { id: 'opt-1', name: 'Mild', price_delta: 0, color_dot: '#10B981' },
      { id: 'opt-2', name: 'Medium', price_delta: 0, color_dot: '#F59E0B' },
      { id: 'opt-3', name: 'Hot', price_delta: 0, color_dot: '#F97316' },
      { id: 'opt-4', name: 'Extra Hot', price_delta: 0, color_dot: '#EF4444' },
    ]);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (mod: ModifierGroup) => {
    setEditingId(mod.id);
    setFormType(mod.type);
    setFormName(mod.name);
    setFormDesc(mod.description || '');
    setFormPrice((mod.price_minor / 100).toString());
    setFormIsActive(mod.is_active);
    setFormApplicableItems(mod.applicable_items?.join(', ') || 'Selected Items');
    setFormOptions(
      mod.options && mod.options.length > 0
        ? [...mod.options]
        : [{ id: 'opt-1', name: 'Default', price_delta: 0, color_dot: '#10B981' }]
    );
    setIsModalOpen(true);
  };

  const handleAddOptionRow = () => {
    const nextIndex = formOptions.length + 1;
    setFormOptions((prev) => [
      ...prev,
      {
        id: `opt-new-${Date.now()}`,
        name: `Option ${nextIndex}`,
        price_delta: 0,
        color_dot: PRESET_DOT_COLORS[nextIndex % PRESET_DOT_COLORS.length],
      },
    ]);
  };

  const handleRemoveOptionRow = (index: number) => {
    if (formOptions.length <= 1) {
      showToast('error', 'At least one option is required.');
      return;
    }
    setFormOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveModifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('error', 'Modifier Name is required.');
      return;
    }

    setSubmitting(true);
    const priceMinor = Math.round(parseFloat(formPrice || '0') * 100);

    try {
      if (editingId) {
        // Edit existing
        const res = await fetch(`/api/modifiers/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDesc.trim(),
            type: formType,
            price_minor: priceMinor,
            is_active: formIsActive,
            options: formOptions,
          }),
        });
        if (res.ok) {
          showToast('success', 'Modifier updated successfully');
          setIsModalOpen(false);
          loadModifiers();
        } else {
          throw new Error();
        }
      } else {
        // Create new
        const res = await fetch('/api/modifiers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: formName.trim(),
            description: formDesc.trim(),
            type: formType,
            price_minor: priceMinor,
            is_active: formIsActive,
            applicable_items_count: 8,
            options: formOptions,
            image_url: '/images/food/dal-baati.jpg',
          }),
        });
        if (res.ok) {
          showToast('success', 'Modifier created successfully');
          setIsModalOpen(false);
          loadModifiers();
        } else {
          throw new Error();
        }
      }
    } catch {
      showToast('error', 'Failed to save modifier');
    } finally {
      setSubmitting(false);
    }
  };

  const getTypeBadge = (type: ModifierGroup['type']) => {
    switch (type) {
      case 'add_on':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-[#FFF7ED] border border-[#FFEDD5] text-[#C2410C] text-[11px] font-semibold">
            Add-on
          </span>
        );
      case 'choice':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-[#EFF6FF] border border-[#DBEAFE] text-[#1D4ED8] text-[11px] font-semibold">
            Choice
          </span>
        );
      case 'size':
        return (
          <span className="px-2.5 py-0.5 rounded-md bg-[#FAF5FF] border border-[#F3E8FF] text-[#7E22CE] text-[11px] font-semibold">
            Size
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
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

      {/* Notice Banner: Moved to Taxes & Billing */}
      <div className="bg-[#FAF6F0] border border-[#E8DCD2] rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <Receipt className="w-4 h-4 text-[#4F0809]" />
          <span className="text-xs text-[#302421]">
            <b>Looking for Taxes &amp; Billing?</b> Modifiers in the sidebar has been replaced with the dedicated <b>Taxes &amp; Billing</b> hub.
          </span>
        </div>
        <Link
          href="/dashboard/taxes-billing"
          className="inline-flex items-center gap-1 text-xs font-bold text-[#4F0809] hover:text-[#680b0c] underline shrink-0"
        >
          <span>Go to Taxes &amp; Billing</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <h1
            className="text-2xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Modifiers
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Manage add-ons, choices and customizations for your menu items
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#680b0c] text-white text-xs font-semibold shadow-xs transition cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
          <span>Add Modifier</span>
        </button>
      </div>

      {/* Filter Tabs matching Screenshot */}
      <div className="flex items-center gap-2 flex-wrap pb-1">
        {[
          { id: 'all', label: 'All Modifiers', count: totalCount },
          { id: 'add_on', label: 'Add-ons', count: addOnsCount },
          { id: 'choice', label: 'Choices', count: choicesCount },
          { id: 'size', label: 'Sizes', count: sizesCount },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition cursor-pointer border ${
                isActive
                  ? 'bg-white text-[#4F0809] border-[#4F0809] shadow-2xs'
                  : 'bg-[#FBF6EF]/50 text-[#81736D] border-transparent hover:bg-[#FBF6EF] hover:text-[#302421]'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-[#4F0809] text-white'
                    : 'bg-[#E8DCD2] text-[#81736D]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Main Table Card */}
      <div className="bg-white border border-[#E8DCD2] rounded-2xl shadow-xs overflow-hidden flex flex-col justify-between">
        <div>
          {/* Table Search & Filter Bar */}
          <div className="p-3.5 border-b border-[#E8DCD2] bg-[#FBF6EF]/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Search modifiers..."
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:outline-none focus:border-[#4F0809]"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white text-[#302421] focus:outline-none cursor-pointer"
              >
                <option value="all">All Types</option>
                <option value="add_on">Add-on</option>
                <option value="choice">Choice</option>
                <option value="size">Size</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as any);
                  setCurrentPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white text-[#302421] focus:outline-none cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>

              <button
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setStatusFilter('all');
                  setActiveTab('all');
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
                <span>Loading modifiers...</span>
              </div>
            ) : filteredModifiers.length === 0 ? (
              <div className="p-12 text-center text-xs text-[#81736D]">
                <Sparkles className="w-8 h-8 text-[#D8AA67] mx-auto mb-2 opacity-60" />
                <p className="font-semibold text-[#4F0809]">No modifiers found</p>
                <p className="text-[11px] text-[#81736D] mt-0.5">
                  Try adjusting filters or click &quot;+ Add Modifier&quot; to create one.
                </p>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#E8DCD2] bg-[#FBF6EF]/50 text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
                    <th className="py-2.5 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === paginatedList.length && paginatedList.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(paginatedList.map((m) => m.id));
                          else setSelectedIds([]);
                        }}
                        className="rounded border-[#E8DCD2] accent-[#4F0809]"
                      />
                    </th>
                    <th className="py-2.5 px-3">Modifier Name</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3">Applicable Items</th>
                    <th className="py-2.5 px-3">Price</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8DCD2]/70 text-[#302421]">
                  {paginatedList.map((mod) => (
                    <tr key={mod.id} className="hover:bg-[#FBF6EF]/40 transition-colors">
                      <td className="py-2.5 px-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(mod.id)}
                          onChange={() => {
                            setSelectedIds((prev) =>
                              prev.includes(mod.id) ? prev.filter((i) => i !== mod.id) : [...prev, mod.id]
                            );
                          }}
                          className="rounded border-[#E8DCD2] accent-[#4F0809]"
                        />
                      </td>

                      {/* Modifier Name with Thumbnail */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={mod.image_url || '/images/food/dal-baati.jpg'}
                            alt={mod.name}
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = '/images/food/dal-baati.jpg';
                            }}
                            className="w-9 h-9 rounded-lg object-cover border border-[#E8DCD2] shrink-0"
                          />
                          <div>
                            <p className="font-bold text-xs text-[#302421]">{mod.name}</p>
                            <p className="text-[10px] text-[#81736D] truncate max-w-xs">
                              {mod.description || 'Custom dish modification option'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Type Badge */}
                      <td className="py-2.5 px-3">{getTypeBadge(mod.type)}</td>

                      {/* Applicable Items */}
                      <td className="py-2.5 px-3">
                        <span className="text-[11px] font-medium text-[#4F0809] hover:underline cursor-pointer">
                          {mod.applicable_items_count} items
                        </span>
                      </td>

                      {/* Price */}
                      <td className="py-2.5 px-3 font-bold text-xs text-[#302421]">
                        ₹{(mod.price_minor / 100).toFixed(2)}
                      </td>

                      {/* Status Toggle Switch */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(mod)}
                            className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                              mod.is_active ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                            }`}
                          >
                            <div
                              className={`w-4 h-4 rounded-full bg-white transition-transform ${
                                mod.is_active ? 'translate-x-4' : 'translate-x-0'
                              }`}
                            />
                          </button>
                          <span
                            className={`text-xs font-semibold ${
                              mod.is_active ? 'text-[#10B981]' : 'text-[#9CA3AF]'
                            }`}
                          >
                            {mod.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(mod)}
                            title="Edit Modifier"
                            className="p-1.5 rounded-md hover:bg-[#FBF6EF] text-[#81736D] hover:text-[#4F0809] transition"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDuplicate(mod)}
                            title="Duplicate Modifier"
                            className="p-1.5 rounded-md hover:bg-[#FBF6EF] text-[#81736D] hover:text-[#4F0809] transition"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(mod.id, mod.name)}
                            title="Delete Modifier"
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

        {/* Pagination Footer */}
        <div className="p-3 border-t border-[#E8DCD2] bg-[#FBF6EF]/40 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#81736D] gap-2">
          <div>
            Showing {filteredModifiers.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1} to{' '}
            {Math.min(currentPage * itemsPerPage, filteredModifiers.length)} of {filteredModifiers.length} modifiers
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2 py-1 rounded border border-[#E8DCD2] bg-white text-[#302421] disabled:opacity-40 cursor-pointer"
              >
                &lt;
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-7 h-7 rounded text-xs font-semibold cursor-pointer ${
                    currentPage === i + 1
                      ? 'bg-[#4F0809] text-white font-bold'
                      : 'bg-white border border-[#E8DCD2] text-[#302421] hover:bg-[#FBF6EF]'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2 py-1 rounded border border-[#E8DCD2] bg-white text-[#302421] disabled:opacity-40 cursor-pointer"
              >
                &gt;
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Add / Edit Modifier Modal matching Screenshot ── */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-[#E8DCD2] max-w-xl w-full p-5 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#E8DCD2] pb-3">
              <h2
                className="text-lg font-bold text-[#4F0809]"
                style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
              >
                {editingId ? 'Edit Modifier' : 'Add Modifier'}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-full text-[#81736D] hover:text-[#4F0809] hover:bg-[#FBF6EF] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveModifier} className="space-y-4 text-xs">
              {/* Modifier Type Selector (3 large interactive cards) */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4F0809] mb-1.5">
                  Modifier Type
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {/* Card 1: Add-on */}
                  <div
                    onClick={() => setFormType('add_on')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      formType === 'add_on'
                        ? 'border-[#4F0809] bg-[#FBF6EF] ring-1 ring-[#4F0809]'
                        : 'border-[#E8DCD2] bg-white hover:bg-[#FBF6EF]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#302421] text-xs">Add-on</span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          formType === 'add_on'
                            ? 'border-[#4F0809] bg-[#4F0809]'
                            : 'border-[#D1D5DB]'
                        }`}
                      >
                        {formType === 'add_on' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#81736D] mt-1">Extra items (e.g. Extra Cheese)</p>
                  </div>

                  {/* Card 2: Choice */}
                  <div
                    onClick={() => setFormType('choice')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      formType === 'choice'
                        ? 'border-[#4F0809] bg-[#FBF6EF] ring-1 ring-[#4F0809]'
                        : 'border-[#E8DCD2] bg-white hover:bg-[#FBF6EF]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#302421] text-xs">Choice</span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          formType === 'choice'
                            ? 'border-[#4F0809] bg-[#4F0809]'
                            : 'border-[#D1D5DB]'
                        }`}
                      >
                        {formType === 'choice' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#81736D] mt-1">Select one (e.g. Spice Level)</p>
                  </div>

                  {/* Card 3: Size */}
                  <div
                    onClick={() => setFormType('size')}
                    className={`p-3 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                      formType === 'size'
                        ? 'border-[#4F0809] bg-[#FBF6EF] ring-1 ring-[#4F0809]'
                        : 'border-[#E8DCD2] bg-white hover:bg-[#FBF6EF]/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#302421] text-xs">Size</span>
                      <div
                        className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                          formType === 'size'
                            ? 'border-[#4F0809] bg-[#4F0809]'
                            : 'border-[#D1D5DB]'
                        }`}
                      >
                        {formType === 'size' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                    <p className="text-[10px] text-[#81736D] mt-1">Different sizes (e.g. Regular/Large)</p>
                  </div>
                </div>
              </div>

              {/* Modifier Name */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                  Modifier Name *
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Spice Level"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/40 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Choose your preferred spice level for this dish"
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/40 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                />
              </div>

              {/* Choice Options List */}
              <div className="space-y-2 border-t border-[#E8DCD2] pt-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-[#4F0809]">Choice Options</h3>
                    <p className="text-[10px] text-[#81736D]">
                      Add multiple options for customers to choose from
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {formOptions.map((opt, idx) => (
                    <div
                      key={opt.id}
                      className="flex items-center gap-2 p-1.5 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/20 hover:bg-[#FBF6EF]/60 transition"
                    >
                      <GripVertical className="w-3.5 h-3.5 text-[#81736D]/60 shrink-0" />
                      <div
                        className="w-3 h-3 rounded-full shrink-0 shadow-2xs"
                        style={{ backgroundColor: opt.color_dot || '#10B981' }}
                      />
                      <input
                        type="text"
                        value={opt.name}
                        onChange={(e) => {
                          const updated = [...formOptions];
                          updated[idx].name = e.target.value;
                          setFormOptions(updated);
                        }}
                        placeholder="Option Name"
                        className="flex-1 px-2.5 py-1 rounded-lg border border-[#E8DCD2] bg-white text-xs focus:outline-none focus:border-[#4F0809]"
                      />
                      <div className="w-24 relative shrink-0">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[11px] text-[#81736D]">
                          ₹
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          value={opt.price_delta}
                          onChange={(e) => {
                            const updated = [...formOptions];
                            updated[idx].price_delta = parseFloat(e.target.value) || 0;
                            setFormOptions(updated);
                          }}
                          placeholder="0.00"
                          className="w-full pl-5 pr-2 py-1 rounded-lg border border-[#E8DCD2] bg-white text-xs focus:outline-none focus:border-[#4F0809]"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveOptionRow(idx)}
                        className="p-1 rounded text-red-500 hover:bg-red-50"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddOptionRow}
                  className="px-3 py-1.5 rounded-lg border border-dashed border-[#B78A48] text-[#4F0809] hover:bg-[#FBF6EF] text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#B78A48]" />
                  <span>Add Option</span>
                </button>
              </div>

              {/* Applicable Menu Items */}
              <div className="border-t border-[#E8DCD2] pt-3">
                <label className="block text-[11px] font-semibold text-[#4F0809] mb-1">
                  Applicable Menu Items
                </label>
                <select
                  value={formApplicableItems}
                  onChange={(e) => setFormApplicableItems(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[#E8DCD2] bg-[#FBF6EF]/40 focus:bg-white focus:outline-none focus:border-[#4F0809]"
                >
                  <option value="All Items">All Menu Items</option>
                  <option value="All Starters & Curries">Starters &amp; Curries</option>
                  <option value="Tandoori & Kebabs">Tandoori &amp; Kebabs</option>
                  <option value="Beverages & Shakes">Beverages &amp; Shakes</option>
                  <option value="Desserts">Desserts</option>
                </select>
              </div>

              {/* Status Switch */}
              <div className="flex items-center justify-between border-t border-[#E8DCD2] pt-3">
                <div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setFormIsActive(!formIsActive)}
                      className={`w-9 h-5 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                        formIsActive ? 'bg-[#10B981]' : 'bg-[#D1D5DB]'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded-full bg-white transition-transform ${
                          formIsActive ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                    <span
                      className={`text-xs font-semibold ${
                        formIsActive ? 'text-[#10B981]' : 'text-[#9CA3AF]'
                      }`}
                    >
                      {formIsActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#81736D] mt-0.5">
                    This modifier will be available for customers
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 rounded-xl border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-4 py-2 rounded-xl bg-[#4F0809] hover:bg-[#680b0c] text-white font-semibold flex items-center gap-1.5 cursor-pointer"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Modifier</span>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  Search,
  Plus,
  Download,
  Filter,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Truck,
  Edit2,
  Trash2,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { dataRepository } from '@/lib/data/repository';
import type { InventoryItem, StockMovement } from '@/lib/types';

export default function InventoryStockPage() {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Stock Adjustment Modal
  const [adjustItem, setAdjustItem] = useState<InventoryItem | null>(null);
  const [adjustType, setAdjustType] = useState<'stock_in' | 'stock_out' | 'wastage'>('stock_in');
  const [adjustQty, setAdjustQty] = useState('10');
  const [adjustReason, setAdjustReason] = useState('');

  // Add Item Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemSku, setNewItemSku] = useState('');
  const [newItemCat, setNewItemCat] = useState('Spices');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemStock, setNewItemStock] = useState('10');
  const [newItemMin, setNewItemMin] = useState('5');
  const [newItemCost, setNewItemCost] = useState('500');
  const [newItemSupplier, setNewItemSupplier] = useState('Jaipur Royal Mandi');

  useEffect(() => {
    // Clear legacy localStorage
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.removeItem('dashboard_inventory');
      } catch {}
    }

    setInventory(dataRepository.getInventory());
    setMovements(dataRepository.getStockMovements());

    const unsub = onSnapshot(
      collection(db, 'inventory'),
      (snap) => {
        if (!snap.empty) {
          setInventory(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as InventoryItem[]);
        }
      },
      () => {}
    );

    return () => unsub();
  }, []);

  const loadData = () => {
    setInventory(dataRepository.getInventory());
    setMovements(dataRepository.getStockMovements());
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return inventory.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.sku.toLowerCase().includes(q) ||
        item.supplier.toLowerCase().includes(q);
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [inventory, searchQuery, categoryFilter, statusFilter]);

  // Metrics
  const totalItemsCount = inventory.length;
  const lowStockCount = inventory.filter((i) => i.status === 'low_stock').length;
  const outOfStockCount = inventory.filter((i) => i.status === 'out_of_stock').length;
  const totalStockValue = inventory.reduce(
    (sum, i) => sum + (i.current_stock * i.cost_per_unit_minor) / 100,
    0
  );

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItem) return;
    const qty = parseFloat(adjustQty) || 0;
    if (qty <= 0) return;

    dataRepository.recordStockMovement({
      item_id: adjustItem.id,
      item_name: adjustItem.name,
      type: adjustType,
      quantity: qty,
      reason: adjustReason || (adjustType === 'stock_in' ? 'Fresh delivery received' : 'Kitchen consumption'),
      recorded_by: 'Inventory In-Charge',
    });

    setAdjustItem(null);
    setAdjustQty('10');
    setAdjustReason('');
    loadData();
  };

  const handleCreateItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim() || !newItemSku.trim()) return;

    const stock = parseFloat(newItemStock) || 0;
    const min = parseFloat(newItemMin) || 5;
    const cost = (parseFloat(newItemCost) || 100) * 100;

    const newItem: InventoryItem = {
      id: `inv-${Date.now()}`,
      name: newItemName.trim(),
      sku: newItemSku.trim().toUpperCase(),
      category: newItemCat,
      unit: newItemUnit,
      current_stock: stock,
      min_stock: min,
      cost_per_unit_minor: cost,
      supplier: newItemSupplier.trim(),
      last_updated: new Date().toLocaleTimeString(),
      status: stock <= 0 ? 'out_of_stock' : stock <= min ? 'low_stock' : 'in_stock',
    };

    dataRepository.getInventory().unshift(newItem);
    setIsAddModalOpen(false);
    setNewItemName('');
    setNewItemSku('');
    loadData();
  };

  const handleExportCSV = () => {
    const headers = ['SKU,Item Name,Category,Unit,Current Stock,Min Stock,Cost Per Unit,Supplier,Status'];
    const rows = filteredItems.map((i) => [
      `"${i.sku}"`,
      `"${i.name}"`,
      `"${i.category}"`,
      `"${i.unit}"`,
      i.current_stock,
      i.min_stock,
      `"₹${(i.cost_per_unit_minor / 100).toLocaleString()}"`,
      `"${i.supplier}"`,
      i.status,
    ].join(','));
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers, ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `rajmahal_inventory_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <h1
            className="text-2xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Palace Kitchen Inventory &amp; Stock Ledger
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Monitor raw culinary ingredients, royal spices, guest amenities, stock levels, and automated reorder alerts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-xs transition"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
            Add Inventory Item
          </button>
        </div>
      </div>

      {/* ── 4 Metric Overview Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Total Tracked Items
            </div>
            <div className="text-xl font-bold text-[#302421] mt-0.5">{totalItemsCount}</div>
            <div className="text-[10px] text-[#2E7D32] font-medium mt-0.5">Across pantry &amp; bar</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <Package className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Low Stock Alerts
            </div>
            <div className="text-xl font-bold text-[#D97706] mt-0.5">{lowStockCount}</div>
            <div className="text-[10px] text-[#D97706] font-medium mt-0.5">! Need attention</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#D97706]">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Out of Stock
            </div>
            <div className="text-xl font-bold text-red-600 mt-0.5">{outOfStockCount}</div>
            <div className="text-[10px] text-[#81736D] mt-0.5">Reorder required</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-red-600">
            <XCircle className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
              Total Stock Valuation
            </div>
            <div className="text-xl font-bold text-[#4F0809] mt-0.5">
              ₹{Math.round(totalStockValue).toLocaleString('en-IN')}
            </div>
            <div className="text-[10px] text-[#81736D] mt-0.5">Current cost basis</div>
          </div>
          <div className="w-9 h-9 rounded-lg bg-[#FBF6EF] border border-[#E8DCD2] flex items-center justify-center text-[#4F0809]">
            <Truck className="w-4 h-4 text-[#B78A48]" />
          </div>
        </div>
      </div>

      {/* ── Search & Filter Controls ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#81736D]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search item, SKU, or supplier..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
          >
            <option value="all">All Categories</option>
            <option value="Spices">Spices &amp; Seasonings</option>
            <option value="Dairy">Dairy &amp; Cream</option>
            <option value="Oils">Cooking Oils</option>
            <option value="Grains">Grains &amp; Basmati</option>
            <option value="Vegetables">Fresh Vegetables</option>
            <option value="Guest Amenities">Guest Amenities</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
          >
            <option value="all">All Stock Statuses</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock Alerts</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* ── Working Item Table ── */}
      <div className="bg-white border border-[#E8DCD2] rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#E8DCD2] bg-[#FBF6EF]/75 text-[10px] font-bold uppercase tracking-wider text-[#81736D]">
                <th className="py-2.5 px-3">Item &amp; SKU</th>
                <th className="py-2.5 px-3">Category</th>
                <th className="py-2.5 px-3">Stock Level</th>
                <th className="py-2.5 px-3">Min Threshold</th>
                <th className="py-2.5 px-3">Cost / Unit</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Stock Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8DCD2]/70 text-[#302421]">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-xs text-[#81736D]">
                    No inventory items found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FBF6EF]/50 transition-colors">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#4F0809]">{item.name}</div>
                      <div className="text-[10px] font-mono text-[#81736D]">{item.sku}</div>
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-[#F6EAE0] text-[10px] font-medium text-[#302421]">
                        {item.category}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-[#302421]">
                      {item.current_stock} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-[#81736D]">
                      {item.min_stock} {item.unit}
                    </td>
                    <td className="py-2.5 px-3 font-medium">
                      ₹{(item.cost_per_unit_minor / 100).toLocaleString('en-IN')} / {item.unit}
                    </td>
                    <td className="py-2.5 px-3 text-[#81736D] truncate max-w-[140px]">
                      {item.supplier}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status === 'in_stock'
                            ? 'bg-[#2E7D32]/15 text-[#2E7D32]'
                            : item.status === 'low_stock'
                            ? 'bg-[#D97706]/15 text-[#D97706]'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setAdjustItem(item);
                            setAdjustType('stock_in');
                          }}
                          className="px-2 py-1 rounded bg-[#2E7D32]/10 hover:bg-[#2E7D32]/20 text-[#2E7D32] text-[11px] font-medium transition"
                          title="Record Stock In"
                        >
                          + In
                        </button>
                        <button
                          onClick={() => {
                            setAdjustItem(item);
                            setAdjustType('stock_out');
                          }}
                          className="px-2 py-1 rounded bg-[#FBF6EF] hover:bg-[#E8DCD2] text-[#4F0809] text-[11px] font-medium transition"
                          title="Record Stock Out"
                        >
                          - Out
                        </button>
                        <button
                          onClick={() => {
                            setAdjustItem(item);
                            setAdjustType('wastage');
                          }}
                          className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-medium transition"
                          title="Record Wastage"
                        >
                          Wastage
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="py-2 px-3 bg-[#FBF6EF]/50 border-t border-[#E8DCD2] text-[11px] text-[#81736D] flex justify-between items-center">
          <span>Showing {filteredItems.length} of {totalItemsCount} stock items</span>
          <span className="font-serif italic text-[#4F0809]">Rajmahal Palace Kitchen Supplies</span>
        </div>
      </div>

      {/* ── Stock Adjustment Modal ── */}
      {adjustItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-md w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setAdjustItem(null)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FBF6EF] text-[#81736D]"
            >
              ✕
            </button>
            <h2
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Adjust Item Stock: {adjustItem.name}
            </h2>
            <p className="text-xs text-[#81736D] mb-4">
              Current balance: <b>{adjustItem.current_stock} {adjustItem.unit}</b>
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Movement Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Stock In (+)', value: 'stock_in' },
                    { label: 'Stock Out (-)', value: 'stock_out' },
                    { label: 'Wastage (-)', value: 'wastage' },
                  ].map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setAdjustType(t.value as any)}
                      className={`py-1.5 rounded-lg border text-xs font-semibold transition ${
                        adjustType === t.value
                          ? 'bg-[#4F0809] text-white border-[#4F0809]'
                          : 'bg-[#FBF6EF] text-[#81736D] border-[#E8DCD2]'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Quantity ({adjustItem.unit}) *
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Reason / Order Invoice Note
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Daily morning banquet prep, invoice #INV-492..."
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustItem(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-sm transition"
                >
                  Confirm Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Add Inventory Item Modal ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E8DCD2] rounded-2xl max-w-md w-full p-5 shadow-2xl relative">
            <button
              onClick={() => setIsAddModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-[#FBF6EF] text-[#81736D]"
            >
              ✕
            </button>
            <h2
              className="text-xl font-bold text-[#4F0809] mb-1"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              Add New Inventory Stock
            </h2>
            <p className="text-xs text-[#81736D] mb-4">
              Register a new culinary or pantry item for automated tracking
            </p>

            <form onSubmit={handleCreateItem} className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  required
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  placeholder="e.g. Royal Kashmiri Saffron"
                  className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    SKU Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={newItemSku}
                    onChange={(e) => setNewItemSku(e.target.value)}
                    placeholder="e.g. SP-SAF-01"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Category
                  </label>
                  <select
                    value={newItemCat}
                    onChange={(e) => setNewItemCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs bg-white focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    <option value="Spices">Spices &amp; Seasonings</option>
                    <option value="Dairy">Dairy &amp; Cream</option>
                    <option value="Oils">Cooking Oils</option>
                    <option value="Grains">Grains &amp; Basmati</option>
                    <option value="Vegetables">Fresh Vegetables</option>
                    <option value="Guest Amenities">Guest Amenities</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Initial Stock
                  </label>
                  <input
                    type="number"
                    value={newItemStock}
                    onChange={(e) => setNewItemStock(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Min Alert
                  </label>
                  <input
                    type="number"
                    value={newItemMin}
                    onChange={(e) => setNewItemMin(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Unit
                  </label>
                  <input
                    type="text"
                    value={newItemUnit}
                    onChange={(e) => setNewItemUnit(e.target.value)}
                    placeholder="kg, ltr, pkts"
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Cost per Unit (₹)
                  </label>
                  <input
                    type="number"
                    value={newItemCost}
                    onChange={(e) => setNewItemCost(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#302421] mb-1">
                    Approved Supplier
                  </label>
                  <input
                    type="text"
                    value={newItemSupplier}
                    onChange={(e) => setNewItemSupplier(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[#E8DCD2] text-xs focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg border border-[#E8DCD2] text-[#81736D] hover:bg-[#FBF6EF] text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-sm transition"
                >
                  Save Stock Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

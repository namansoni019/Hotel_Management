'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BedDouble,
  Sparkles,
  AlertCircle,
  Wrench,
  CheckCircle2,
  RotateCw,
  Plus,
  Building,
  ClipboardList,
  Search,
  Filter,
  Trash2,
} from 'lucide-react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { roomsService } from '@/lib/services/rooms-service';
import { dataRepository } from '@/lib/data/repository';
import type { Room, HousekeepingState, RoomType } from '@/lib/types';

export default function RoomsHousekeepingPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [filterState, setFilterState] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Add room modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newRoomNumber, setNewRoomNumber] = useState('');
  const [newRoomTypeId, setNewRoomTypeId] = useState('');
  const [newRoomState, setNewRoomState] = useState<HousekeepingState>('available');
  const [newRoomNotes, setNewRoomNotes] = useState('');

  const fetchRoomsData = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/rooms');
      if (res.ok) {
        const data = await res.json();
        if (data.rooms && Array.isArray(data.rooms)) {
          setRooms(data.rooms);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rajmahal_rooms', JSON.stringify(data.rooms));
          }
        }
        if (data.roomTypes && Array.isArray(data.roomTypes)) {
          setRoomTypes(data.roomTypes);
          if (!newRoomTypeId && data.roomTypes.length > 0) {
            setNewRoomTypeId(data.roomTypes[0].id);
          }
        }
      }
    } catch (err) {
      console.warn('Error fetching /api/rooms:', err);
    } finally {
      setIsLoading(false);
    }
  }, [newRoomTypeId]);

  useEffect(() => {
    // 1. Initial hydration from cache and repository
    const initialTypes = dataRepository.getRoomTypes();
    setRoomTypes(initialTypes);
    if (initialTypes.length > 0) {
      setNewRoomTypeId(initialTypes[0].id);
    }

    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('rajmahal_rooms');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setRooms(parsed);
          } else {
            setRooms(dataRepository.getRooms());
          }
        } else {
          setRooms(dataRepository.getRooms());
        }
      } catch {
        setRooms(dataRepository.getRooms());
      }
    } else {
      setRooms(dataRepository.getRooms());
    }

    // 2. Fetch live data from /api/rooms
    fetchRoomsData();

    // 3. Subscribe to Firestore updates
    const unsubRooms = onSnapshot(
      collection(db, 'rooms'),
      (snap) => {
        if (!snap.empty) {
          const rts = dataRepository.getRoomTypes();
          const liveRooms = snap.docs.map((d) => {
            const data = d.data();
            const typeId = data.room_type_id || rts[0]?.id;
            const matchedType = rts.find((rt) => rt.id === typeId) || rts[0];
            return {
              id: d.id,
              room_number: data.room_number,
              room_type_id: typeId,
              housekeeping_state: data.housekeeping_state || 'available',
              notes: data.notes || null,
              room_type: data.room_type || matchedType,
            } as Room;
          });
          setRooms(liveRooms);
          if (typeof window !== 'undefined') {
            localStorage.setItem('rajmahal_rooms', JSON.stringify(liveRooms));
          }
        }
      },
      () => {}
    );

    return () => {
      unsubRooms();
    };
  }, [fetchRoomsData]);

  const handleStateChange = async (roomId: string, newState: HousekeepingState) => {
    setRooms((prev) => {
      const updated = prev.map((r) => (r.id === roomId ? { ...r, housekeeping_state: newState } : r));
      if (typeof window !== 'undefined') {
        localStorage.setItem('rajmahal_rooms', JSON.stringify(updated));
      }
      return updated;
    });

    try {
      await roomsService.updateRoomHousekeeping(roomId, newState);
    } catch {
      dataRepository.updateRoomHousekeeping(roomId, newState);
    }
  };

  const handleDeleteRoom = async (roomId: string, roomNumber: string) => {
    if (window.confirm(`Are you sure you want to delete Room ${roomNumber}?`)) {
      setRooms((prev) => {
        const updated = prev.filter((r) => r.id !== roomId);
        if (typeof window !== 'undefined') {
          localStorage.setItem('rajmahal_rooms', JSON.stringify(updated));
        }
        return updated;
      });

      try {
        await fetch(`/api/rooms?id=${roomId}`, { method: 'DELETE' });
      } catch {
        dataRepository.deleteRoom(roomId);
      }
    }
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomNumber.trim()) return;

    setIsSubmitting(true);
    setActionError(null);

    const cleanNum = newRoomNumber.trim().replace(/^(room|chamber)\s*/i, '');
    const matchedType = roomTypes.find((rt) => rt.id === newRoomTypeId) || roomTypes[0];

    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room_number: cleanNum,
          room_type_id: matchedType?.id || 'd0000000-0000-0000-0000-000000000001',
          housekeeping_state: newRoomState,
          notes: newRoomNotes || null,
        }),
      });

      let savedRoom: Room;
      if (res.ok) {
        const data = await res.json();
        savedRoom = data.room;
      } else {
        savedRoom = dataRepository.addRoom({
          room_number: cleanNum,
          room_type_id: matchedType?.id || 'd0000000-0000-0000-0000-000000000001',
          housekeeping_state: newRoomState,
          notes: newRoomNotes || null,
        });
        savedRoom.room_type = matchedType;
      }

      // Optimistic update
      setRooms((prev) => {
        const updated = [savedRoom, ...prev.filter((r) => r.id !== savedRoom.id && r.room_number !== cleanNum)];
        if (typeof window !== 'undefined') {
          localStorage.setItem('rajmahal_rooms', JSON.stringify(updated));
        }
        return updated;
      });

      setIsAddModalOpen(false);
      setNewRoomNumber('');
      setNewRoomNotes('');
      fetchRoomsData();
    } catch (err: any) {
      console.error('Error creating room:', err);
      setActionError(err.message || 'Failed to save chamber');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredRooms = useMemo(() => {
    return rooms.filter((r) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        r.room_number.toLowerCase().includes(q) ||
        (r.room_type?.name && r.room_type.name.toLowerCase().includes(q));
      const matchesFilter = filterState === 'all' || r.housekeeping_state === filterState;
      return matchesSearch && matchesFilter;
    });
  }, [rooms, searchQuery, filterState]);

  // Metric counts
  const totalCount = rooms.length;
  const availableCount = rooms.filter((r) => r.housekeeping_state === 'available').length;
  const occupiedCount = rooms.filter((r) => r.housekeeping_state === 'occupied').length;
  const dirtyCount = rooms.filter((r) => r.housekeeping_state === 'dirty').length;
  const cleaningCount = rooms.filter((r) => r.housekeeping_state === 'cleaning').length;

  return (
    <div className="space-y-4">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#E8DCD2]">
        <div>
          <h1
            className="text-2xl font-bold text-[#4F0809]"
            style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
          >
            Chambers &amp; Room Availability
          </h1>
          <p className="text-xs text-[#81736D] mt-0.5">
            Real-time palace chamber status, housekeeping state management, and suite allocations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchRoomsData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E8DCD2] bg-white text-[#4F0809] hover:bg-[#F6EAE0] text-xs font-medium shadow-xs transition"
          >
            <RotateCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
            Add Chamber
          </button>
        </div>
      </div>

      {/* ── Metric Summary ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#81736D] uppercase font-bold tracking-wider block">
            Total Chambers
          </span>
          <span className="text-xl font-bold text-[#302421] mt-0.5 block">{totalCount}</span>
          <span className="text-[10px] text-[#81736D]">Across all palace wings</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#2E7D32] uppercase font-bold tracking-wider block">
            Available Ready
          </span>
          <span className="text-xl font-bold text-[#2E7D32] mt-0.5 block">{availableCount}</span>
          <span className="text-[10px] text-[#2E7D32]">Clean &amp; inspected</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#4F0809] uppercase font-bold tracking-wider block">
            Occupied Suites
          </span>
          <span className="text-xl font-bold text-[#4F0809] mt-0.5 block">{occupiedCount}</span>
          <span className="text-[10px] text-[#81736D]">
            {Math.round((occupiedCount / (totalCount || 1)) * 100)}% Occupancy
          </span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-[#D97706] uppercase font-bold tracking-wider block">
            In Cleaning
          </span>
          <span className="text-xl font-bold text-[#D97706] mt-0.5 block">{cleaningCount}</span>
          <span className="text-[10px] text-[#81736D]">Attendant turnaround</span>
        </div>

        <div className="bg-white border border-[#E8DCD2] rounded-xl p-3 shadow-xs">
          <span className="text-[10px] text-red-600 uppercase font-bold tracking-wider block">
            Dirty / Turnover
          </span>
          <span className="text-xl font-bold text-red-600 mt-0.5 block">{dirtyCount}</span>
          <span className="text-[10px] text-[#81736D]">Needs housekeeping</span>
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
            placeholder="Search room number or suite type..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-[#E8DCD2] text-xs bg-[#FBF6EF]/50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F0809]"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['all', 'available', 'occupied', 'cleaning', 'dirty', 'maintenance'] as const).map(
            (st) => (
              <button
                key={st}
                onClick={() => setFilterState(st)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize whitespace-nowrap transition ${
                  filterState === st
                    ? 'bg-[#4F0809] text-white shadow-xs'
                    : 'bg-[#FBF6EF] text-[#81736D] hover:text-[#302421]'
                }`}
              >
                {st}
              </button>
            )
          )}
        </div>
      </div>

      {/* ── Room Cards Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {filteredRooms.length === 0 ? (
          <div className="col-span-full py-16 text-center bg-white border border-[#E8DCD2] rounded-2xl p-6">
            <div className="w-12 h-12 rounded-full bg-[#FBF6EF] text-[#B78A48] flex items-center justify-center mx-auto mb-3">
              <BedDouble className="w-6 h-6" />
            </div>
            <h3
              className="text-lg font-bold text-[#302421]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
            >
              No Palace Chambers Found
            </h3>
            <p className="text-xs text-[#81736D] max-w-sm mx-auto mt-1 mb-4">
              {rooms.length === 0
                ? 'No rooms exist in the palace inventory yet. Add your first chamber to start managing occupancy and housekeeping.'
                : 'No rooms match the current search or filter criteria.'}
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#4F0809] hover:bg-[#6B1518] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#D8AA67]" />
              Add Chamber
            </button>
          </div>
        ) : (
          filteredRooms.map((room) => {
            const isOcc = room.housekeeping_state === 'occupied';
            const isAvail = room.housekeeping_state === 'available';
            const isClean = room.housekeeping_state === 'cleaning';
            const isDirty = room.housekeeping_state === 'dirty';

            return (
              <div
                key={room.id}
                className={`p-3 rounded-xl border shadow-xs transition hover:shadow-md flex flex-col justify-between ${
                  isOcc
                    ? 'bg-white border-[#4F0809]/40'
                    : isAvail
                    ? 'bg-white border-[#2E7D32]/40'
                    : isClean
                    ? 'bg-amber-50/50 border-amber-300'
                    : 'bg-red-50/40 border-red-200'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span
                      className="text-base font-bold text-[#302421]"
                      style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                    >
                      Room {room.room_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          isOcc
                            ? 'bg-[#4F0809] text-white'
                            : isAvail
                            ? 'bg-[#2E7D32]/15 text-[#2E7D32]'
                            : isClean
                            ? 'bg-amber-200 text-amber-900'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {room.housekeeping_state}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleDeleteRoom(room.id, room.room_number)}
                        title="Delete Chamber"
                        className="p-1 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded transition cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="text-[10px] text-[#81736D] truncate mb-2">
                    {room.room_type?.name || 'Heritage Suite'}
                  </div>
                </div>

                {/* Quick Actions Dropdown */}
                <div className="pt-2 border-t border-[#E8DCD2] flex items-center justify-between gap-1.5">
                  <select
                    value={room.housekeeping_state}
                    onChange={(e) => handleStateChange(room.id, e.target.value as any)}
                    className="w-full text-[10px] py-1 px-1.5 rounded border border-[#E8DCD2] bg-[#FBF6EF] text-[#302421] focus:ring-1 focus:ring-[#4F0809] focus:outline-none"
                  >
                    <option value="available">Available</option>
                    <option value="occupied">Occupied</option>
                    <option value="cleaning">Cleaning</option>
                    <option value="dirty">Dirty</option>
                    <option value="maintenance">Maintenance</option>
                  </select>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── Add Palace Chamber Modal (Royal Heritage Palace Theme) ── */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#FDF8EE] border border-[#E8DFCE] rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl relative text-[#4F0809] animate-fade-in">
            {/* Royal Maroon Header with Gold Ornaments */}
            <div className="bg-gradient-to-r from-[#4F0809] via-[#651012] to-[#4F0809] text-[#FFF8EB] p-5 relative border-b border-[#D8AA67]/40">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-[#D8AA67] flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                ✕
              </button>

              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#D8AA67]/20 border border-[#D8AA67]/40 flex items-center justify-center shrink-0 text-[#D8AA67] shadow-inner">
                  <BedDouble className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-[10px] font-bold text-[#D8AA67] tracking-[0.2em] uppercase">
                      Palace Inventory
                    </span>
                    <span className="text-[#D8AA67] text-[8px]">&#9830;</span>
                    <span className="text-[10px] text-[#FFF8EB]/80 font-medium">PMS Ledger</span>
                  </div>
                  <h2
                    className="text-2xl font-bold text-[#FFF8EB] leading-tight"
                    style={{ fontFamily: "'Cormorant Garamond', Georgia, serif" }}
                  >
                    Add Palace Chamber
                  </h2>
                </div>
              </div>
            </div>

            {/* Error prompt */}
            {actionError && (
              <div className="m-4 p-3 rounded-xl bg-red-100 text-red-900 text-xs flex items-center space-x-2 border border-red-300">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-700" />
                <span>{actionError}</span>
              </div>
            )}

            <form onSubmit={handleCreateRoom} className="p-5 sm:p-6 space-y-4 text-xs">
              {/* Chamber Number */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                  Chamber / Room Number *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-serif font-bold text-[#9C7A45]">
                    №
                  </span>
                  <input
                    type="text"
                    required
                    value={newRoomNumber}
                    onChange={(e) => setNewRoomNumber(e.target.value)}
                    placeholder="e.g. 101, 204, Suite 301"
                    className="w-full h-11 pl-9 pr-3.5 text-xs sm:text-sm rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/50 font-semibold"
                  />
                </div>
              </div>

              {/* Chamber Type (Deluxe vs Non-Deluxe) */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D]">
                    Chamber Category *
                  </label>
                  <span className="text-[10px] font-semibold text-[#9C7A45]">
                    Deluxe or Non-Deluxe
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {roomTypes.slice(0, 2).map((rt) => {
                    const isDeluxe = !rt.name.toLowerCase().includes('non');
                    const isSelected = newRoomTypeId === rt.id;
                    return (
                      <button
                        key={rt.id}
                        type="button"
                        onClick={() => setNewRoomTypeId(rt.id)}
                        className={`p-3 rounded-2xl border text-left transition cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'border-[#4F0809] bg-[#4F0809] text-[#FFF8EB] shadow-md'
                            : 'border-[#E8DFCE] bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809]'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? 'text-[#D8AA67]' : 'text-[#856B4D]'}`}>
                            {isDeluxe ? 'Royal Luxury' : 'Heritage Standard'}
                          </span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 text-[#D8AA67]" />}
                        </div>
                        <div className="font-bold text-sm sm:text-base leading-snug">
                          {isDeluxe ? 'Deluxe Room' : 'Non-Deluxe Room'}
                        </div>
                        <div className={`text-[11px] font-medium mt-1 ${isSelected ? 'text-[#FFF8EB]/80' : 'text-[#856B4D]'}`}>
                          {isDeluxe ? '₹6,500 / night • King Bed' : '₹4,500 / night • Double Bed'}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Initial State */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                  Initial Chamber State *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: 'available', label: 'Available / Clean' },
                    { id: 'occupied', label: 'Occupied' },
                    { id: 'cleaning', label: 'Cleaning In Progress' },
                    { id: 'dirty', label: 'Needs Cleaning' },
                  ].map((s) => {
                    const isSel = newRoomState === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setNewRoomState(s.id as HousekeepingState)}
                        className={`py-2 px-2 rounded-xl border text-[11px] font-semibold text-center transition cursor-pointer ${
                          isSel
                            ? 'border-[#4F0809] bg-[#4F0809] text-[#FFF8EB] shadow-xs'
                            : 'border-[#E8DFCE] bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809]'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chamber Amenities / Notes */}
              <div>
                <label className="block text-[11px] uppercase tracking-wider font-bold text-[#856B4D] mb-1.5">
                  Chamber Amenities / Balcony Notes (Optional)
                </label>
                <textarea
                  rows={2}
                  value={newRoomNotes}
                  onChange={(e) => setNewRoomNotes(e.target.value)}
                  placeholder="e.g. Palace courtyard garden view, deep marble bath, carved stone jharokha..."
                  className="w-full p-3 rounded-xl bg-[#F5ECDC] focus:bg-[#EFE2CC] border border-[#E8DFCE] focus:border-[#4F0809] focus:outline-none text-[#4F0809] placeholder-[#856B4D]/50 text-xs resize-none"
                />
              </div>

              {/* Actions Footer */}
              <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-[#E8DFCE]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#F5ECDC] hover:bg-[#EFE2CC] text-[#4F0809] text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-[#4F0809] hover:bg-[#6B1518] text-[#FFF8EB] text-xs font-bold shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin text-[#D8AA67]" />
                      <span>Saving Chamber...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-[#D8AA67]" />
                      <span>Save Chamber</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
